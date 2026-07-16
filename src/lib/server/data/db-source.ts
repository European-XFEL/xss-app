/**
 * Database-backed data source implementation using Drizzle ORM.
 *
 * This module implements the data source interfaces by querying the
 * Postgres database through the existing Drizzle setup.
 */
import { DrizzleQueryError, eq, inArray } from 'drizzle-orm';
import Papa from 'papaparse';

import { error } from '@sveltejs/kit';

import { BACKEND_URL as BACKEND_URL_ENV } from '$app/env/private';

import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { sha256HexFromText } from '$lib/server/db/util';
import {
  SimulationService,
  createClient,
  createConnectTransport,
} from '$lib/server/grpc';
import { MAX_UPLOAD_ATOM_COUNT } from '$lib/shared/contracts';
import type {
  DebyeResult,
  MoleculeFileContent,
  MoleculeInfo,
  MutationResult,
  SimRequest,
  SolventIQ,
  SolventInfo,
  UploadMoleculeResult,
} from '$lib/shared/contracts';

import type {
  EditMoleculeFileContentsInput,
  EditMoleculeFileInput,
  EditMoleculeInput,
  MoleculeDataSource,
  ReplaceMoleculeFileInput,
  SimulationDataSource,
  SolventDataSource,
  UploadMoleculeInput,
} from './types';

const BACKEND_URL = BACKEND_URL_ENV ?? 'http://localhost:50051';

const transport = createConnectTransport({
  baseUrl: `${BACKEND_URL}`,
  httpVersion: '1.1',
});

const simClient = createClient(SimulationService, transport);

type SolventDifferentials = {
  Q: number;
  dSdT: number;
  dSdRho: number;
};

const atomCountLine = /^(\s*\d+)/;

/** Postgres unique-constraint violation (SQLSTATE 23505). */
function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof DrizzleQueryError)) return false;
  const cause = err.cause as { code?: string } | undefined;
  return cause?.code === '23505';
}

function extractAtomCount(contents: string) {
  const firstLine = contents.split(/\r?\n/, 1)[0]?.trim();
  if (!firstLine) return null;
  const match = atomCountLine.exec(firstLine);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Derive the atom count for new file contents, falling back to
 * `fallback` (the client-declared value, upload only) when the first line
 * can't be parsed. Shared by uploadMolecule and the contents-mutation
 * methods below, which have no fallback and error instead.
 */
function deriveAtomCount(
  contents: string,
  fallback: number | null = null,
): { ok: true; atomCount: number } | { ok: false; error: string } {
  const resolved = extractAtomCount(contents) ?? fallback;
  if (resolved === null) {
    return {
      ok: false,
      error: 'Unable to read the atom count from this file.',
    };
  }
  if (resolved > MAX_UPLOAD_ATOM_COUNT) {
    return {
      ok: false,
      error: `Structure has too many atoms (${resolved}); the maximum is ${MAX_UPLOAD_ATOM_COUNT}.`,
    };
  }
  return { ok: true, atomCount: resolved };
}

/** Reject edits/deletes of a read-only structure file, distinct from not-found. */
async function checkFileEditable(
  id: string,
): Promise<{ ok: true } | { ok: false; result: MutationResult }> {
  const row = await db.query.moleculeFiles.findFirst({
    where: { id },
    columns: { readOnly: true },
  });
  if (!row) {
    return {
      ok: false,
      result: { success: false, error: 'Structure file not found.' },
    };
  }
  if (row.readOnly) {
    return {
      ok: false,
      result: {
        success: false,
        error: 'This structure file is read-only and cannot be modified.',
      },
    };
  }
  return { ok: true };
}

/** Same as `checkFileEditable`, for every file sharing a molecule name. */
async function checkMoleculeEditable(
  moleculeName: string,
): Promise<
  { ok: true; ids: string[] } | { ok: false; result: MutationResult }
> {
  const rows = await db.query.moleculeFiles.findMany({
    where: { moleculeName },
    columns: { id: true, readOnly: true },
  });
  if (rows.length === 0) {
    return {
      ok: false,
      result: { success: false, error: 'Molecule not found.' },
    };
  }
  if (rows.some((row) => row.readOnly)) {
    return {
      ok: false,
      result: {
        success: false,
        error: 'This molecule is read-only and cannot be modified.',
      },
    };
  }
  return { ok: true, ids: rows.map((row) => row.id) };
}

/**
 * Recompute sha/atomCount for new contents, write them (and `filename` when
 * given), and drop the file's cached intensities — shared by
 * editMoleculeFileContents and replaceMoleculeFile.
 */
async function updateFileContents(
  id: string,
  contents: string,
  filename?: string,
): Promise<MutationResult> {
  const derived = deriveAtomCount(contents);
  if (!derived.ok) {
    return { success: false, error: derived.error };
  }

  const sha = await sha256HexFromText(contents);
  try {
    await db
      .update(schema.moleculeFiles)
      .set({
        contents,
        sha,
        atomCount: derived.atomCount,
        ...(filename ? { filename } : {}),
      })
      .where(eq(schema.moleculeFiles.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        success: false,
        error: 'A structure file with identical contents already exists.',
      };
    }
    throw err;
  }

  await db
    .delete(schema.intensities)
    .where(eq(schema.intensities.moleculeId, id));
  return { success: true };
}

// ─── Molecule Data Source ───────────────────────────────────────────────────

export const dbMoleculeSource: MoleculeDataSource = {
  async listMolecules(): Promise<MoleculeInfo[]> {
    const rows = await db
      .select(schema.moleculesInfo)
      .from(schema.moleculeFiles);
    // moleculeFiles.updatedAt is nullable in the DB; the domain type uses
    // undefined for "never updated"
    return rows.map((row) => ({
      ...row,
      updatedAt: row.updatedAt ?? undefined,
    }));
  },

  async getMoleculeFileContent(id: string): Promise<MoleculeFileContent> {
    const res = await db.query.moleculeFiles.findFirst({
      where: { id },
      columns: { contents: true },
    });

    if (!res) {
      throw error(404, 'Molecule not found');
    }

    return res;
  },

  async uploadMolecule(
    input: UploadMoleculeInput,
  ): Promise<UploadMoleculeResult> {
    const contents = await input.file.text();
    // Authoritative cap on the count derived from the file itself — the
    // route-level check only sees the client-declared value.
    const derived = deriveAtomCount(contents, input.atomCount);
    if (!derived.ok) {
      return { success: false, result: null, error: derived.error };
    }
    const resolvedAtomCount = derived.atomCount;

    const sha = await sha256HexFromText(contents);

    try {
      const result = await db
        .insert(schema.moleculeFiles)
        .values({
          sha,
          moleculeName: input.moleculeName,
          description: input.description,
          state: input.state,
          reference: input.reference ?? null,
          atomCount: resolvedAtomCount,
          filename: input.file.name,
          contents,
        })
        .returning(schema.moleculesInfo);
      const row = result[0];
      return {
        success: true,
        result: { ...row, updatedAt: row.updatedAt ?? undefined },
      };
    } catch (err) {
      console.error('Failed to insert molecule:', err);
      if (isUniqueViolation(err)) {
        return {
          success: false,
          result: null,
          error: 'A molecule with this name already exists.',
        };
      }
      throw err;
    }
  },

  async editMoleculeFile(
    input: EditMoleculeFileInput,
  ): Promise<MutationResult> {
    const check = await checkFileEditable(input.id);
    if (!check.ok) return check.result;

    await db
      .update(schema.moleculeFiles)
      .set({
        filename: input.filename,
        description: input.description,
        state: input.state,
        reference: input.reference,
      })
      .where(eq(schema.moleculeFiles.id, input.id));
    return { success: true };
  },

  async editMolecule(input: EditMoleculeInput): Promise<MutationResult> {
    const check = await checkMoleculeEditable(input.originalName);
    if (!check.ok) return check.result;

    // Header fields are shared by every structure file of the molecule, so
    // update all rows carrying the original name in one statement.
    await db
      .update(schema.moleculeFiles)
      .set({ moleculeName: input.moleculeName })
      .where(eq(schema.moleculeFiles.moleculeName, input.originalName));
    return { success: true };
  },

  async deleteMoleculeFile(id: string): Promise<MutationResult> {
    const check = await checkFileEditable(id);
    if (!check.ok) return check.result;

    await db
      .delete(schema.intensities)
      .where(eq(schema.intensities.moleculeId, id));
    await db
      .delete(schema.moleculeFiles)
      .where(eq(schema.moleculeFiles.id, id));
    return { success: true };
  },

  async deleteMolecule(originalName: string): Promise<MutationResult> {
    const check = await checkMoleculeEditable(originalName);
    if (!check.ok) return check.result;

    await db
      .delete(schema.intensities)
      .where(inArray(schema.intensities.moleculeId, check.ids));
    await db
      .delete(schema.moleculeFiles)
      .where(eq(schema.moleculeFiles.moleculeName, originalName));
    return { success: true };
  },

  async editMoleculeFileContents(
    input: EditMoleculeFileContentsInput,
  ): Promise<MutationResult> {
    const check = await checkFileEditable(input.id);
    if (!check.ok) return check.result;

    return updateFileContents(input.id, input.contents);
  },

  async replaceMoleculeFile(
    input: ReplaceMoleculeFileInput,
  ): Promise<MutationResult> {
    const check = await checkFileEditable(input.id);
    if (!check.ok) return check.result;

    const contents = await input.file.text();
    return updateFileContents(input.id, contents, input.file.name);
  },
};

// ─── Solvent Data Source ────────────────────────────────────────────────────

export const dbSolventSource: SolventDataSource = {
  async listSolvents(): Promise<SolventInfo[]> {
    const rows = await db.select(schema.solventsInfo).from(schema.solvents);
    // solvents.updatedAt is nullable in the DB; the domain type uses undefined for "never updated"
    return rows.map((row) => ({
      ...row,
      updatedAt: row.updatedAt ?? undefined,
    }));
  },

  async getSolventIQ(id: string): Promise<SolventIQ> {
    const row = await db.query.solvents.findFirst({
      where: { id },
      columns: { contents: true },
    });

    if (!row?.contents) {
      throw error(404, 'Solvent not found');
    }

    const contentsCsv =
      'Q\tdSdT\tdSdRho\n' + row.contents.replaceAll(/#.*\n/g, '');
    const parsed = Papa.parse<SolventDifferentials>(contentsCsv, {
      delimiter: '\t',
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      console.error(`Failed to parse solvent data for ${id}:`, parsed.errors);
      throw error(422, `Failed to parse solvent data for ${id}`);
    }

    const q: number[] = [];
    const dSdT: number[] = [];
    for (const row of parsed.data) {
      if (!Number.isFinite(row.Q) || !Number.isFinite(row.dSdT)) {
        throw error(422, `Solvent data for ${id} contains non-numeric values`);
      }
      q.push(row.Q);
      dSdT.push(row.dSdT);
    }

    return { q, dSdT };
  },
};

// ─── Simulation Data Source ─────────────────────────────────────────────────

export const dbSimulationSource: SimulationDataSource = {
  // Linear cache-lookup → compute → best-effort-cache-write flow; splitting
  // it would hide the fallback ordering that is the whole point here.
  // eslint-disable-next-line max-lines-per-function
  async getDebyeResult(request: SimRequest): Promise<DebyeResult> {
    const fetched = await db.query.intensities.findFirst({
      where: {
        moleculeId: request.fileId,
        qMin: request.qRange.min,
        qMax: request.qRange.max,
        qStep: request.qRange.step,
      },
    });

    if (fetched?.q && fetched?.intensity) {
      return {
        q: fetched.q.map((v) => Number(v)),
        i: fetched.intensity.map((v) => Number(v)),
      };
    }

    const file = await db.query.moleculeFiles.findFirst({
      where: { id: request.fileId },
    });

    if (!file) {
      throw error(404, 'Molecule not found');
    }

    const encoder = new TextEncoder();
    const contents = encoder.encode(file.contents);

    const requestBody = {
      structure: {
        filename: file.filename,
        contents: contents,
      },
      qRange: {
        min: request.qRange.min,
        max: request.qRange.max,
        step: request.qRange.step,
      },
    };

    const result = await simClient.calcDebye(requestBody);

    // Best-effort cache write
    try {
      await db.insert(schema.intensities).values({
        moleculeId: request.fileId,
        qMin: request.qRange.min,
        qMax: request.qRange.max,
        qStep: request.qRange.step,
        intensity: result.i.map(String),
        q: result.q.map(String),
      });
    } catch (err) {
      if (!isUniqueViolation(err)) {
        console.error('Failed to cache intensity result:', err);
      }
    }

    return result;
  },
};
