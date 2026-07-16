/**
 * Remote functions for molecule data
 * (https://svelte.dev/docs/kit/remote-functions).
 *
 * Replaces GET /api/molecules (list + ?id= detail) and the hand-rolled
 * POST /api/upload flow.
 *
 * `listMolecules` is target-switched at build time (`PUBLIC_TARGET` is
 * inlined, so the other branch is dead-code-eliminated):
 * - static: `prerender` — the demo dataset is fixed at build time, and
 *   `query` cannot run on fully prerendered pages.
 * - node: `query` — molecules are created at runtime by the upload form, and
 *   a `prerender`'s browser-side Cache API response would go stale until the
 *   next deployment; `query` stays fresh and is refreshable after uploads.
 *
 * `getMoleculeFileContent` is target-switched like `listMolecules`: on the
 * static target contents are fixed at build time so `prerender` applies (see
 * `$lib/sample/solvent.remote` for why `inputs` is gated behind the static
 * target — kit prerender-queue race, initial-dev-a69 — and why
 * `dynamic: true` is needed). On node it must be a `query`: the
 * editMoleculeFileContents/replaceMoleculeFile mutations rewrite an existing
 * id's contents, so a prerender's browser-side Cache API response would stay
 * stale until the next deployment.
 */
import * as Sentry from '@sentry/sveltekit';

import { PUBLIC_TARGET } from '$app/env/public';
import { command, form, prerender, query } from '$app/server';

import { moleculeSource } from '$lib/server/data';
import {
  deleteMoleculeFileSchema,
  deleteMoleculeSchema,
  editMoleculeFileContentsSchema,
  editMoleculeFileSchema,
  editMoleculeSchema,
  idSchema,
  replaceMoleculeFileSchema,
  uploadMoleculeSchema,
} from '$lib/shared/api/validation';
import type {
  MutationResult,
  UploadMoleculeResult,
} from '$lib/shared/contracts';

const STATIC = PUBLIC_TARGET === 'static';
// Reads are prerendered for both serverless adapter-static builds: `static`
// (demo) and `local` (client-side). A `query` cannot run on a fully
// prerendered, backendless deploy, so the demo dataset is baked in at build
// time and served from the browser Cache API. Runtime mutations remain gated on
// `STATIC` alone (unchanged); in `local` they're unreachable because the upload
// capability is reported unavailable (see `getCapabilities`) until bead ej2.9
// wires client-side CRUD.
const PRERENDERED = STATIC || PUBLIC_TARGET === 'local';

const listMoleculesQuery = query(async () => {
  return await moleculeSource.listMolecules();
});

export const listMolecules = PRERENDERED
  ? prerender(async () => {
      return await moleculeSource.listMolecules();
    })
  : listMoleculesQuery;

// The underlying data source (db-source.ts / static-source.ts) already
// throws a proper `error(404, 'Molecule not found')` for an unknown id, so
// it propagates as-is — no extra try/catch needed here.
const getMoleculeFileContentQuery = query(idSchema, async (id) => {
  return await moleculeSource.getMoleculeFileContent(id);
});

export const getMoleculeFileContent = PRERENDERED
  ? prerender(
      idSchema,
      async (id) => {
        return await moleculeSource.getMoleculeFileContent(id);
      },
      {
        dynamic: true,
        inputs: async () => {
          const molecules = await moleculeSource.listMolecules();
          return molecules.map((molecule) => molecule.id);
        },
      },
    )
  : getMoleculeFileContentQuery;

export const uploadMolecule = form(
  uploadMoleculeSchema,
  async (data): Promise<UploadMoleculeResult> => {
    if (STATIC) {
      return {
        success: false,
        result: null,
        error: 'Uploading molecules is not supported in the static build.',
      };
    }

    const result = await moleculeSource.uploadMolecule({
      moleculeName: data.moleculeName,
      description: data.description,
      state: data.state,
      reference: data.reference?.trim() ? data.reference.trim() : null,
      atomCount: data.atomCount,
      file: data.file,
    });

    Sentry.metrics.count('molecule.uploads', 1, {
      attributes: { status: result.success ? 'ok' : 'error' },
    });
    if (result.success) {
      Sentry.logger.info('Molecule uploaded', {
        moleculeName: data.moleculeName,
        atomCount: data.atomCount,
      });
      // Single-flight mutation: send the refreshed molecule list back with
      // this response instead of letting the client invalidate every query
      // (which would also re-run the expensive Debye queries).
      void listMoleculesQuery().refresh();
    } else {
      Sentry.logger.warn('Molecule upload failed', {
        moleculeName: data.moleculeName,
        error: result.error,
      });
    }

    return result;
  },
);

export const editMoleculeFile = form(
  editMoleculeFileSchema,
  async (data): Promise<MutationResult> => {
    if (STATIC) {
      return {
        success: false,
        error: 'Editing molecules is not supported in the static build.',
      };
    }

    const result = await moleculeSource.editMoleculeFile({
      id: data.id,
      filename: data.filename,
      description: data.description,
      state: data.state,
      reference: data.reference?.trim() ? data.reference.trim() : null,
    });

    // Single-flight mutation, same rationale as uploadMolecule above.
    if (result.success) void listMoleculesQuery().refresh();
    return result;
  },
);

export const editMolecule = form(
  editMoleculeSchema,
  async (data): Promise<MutationResult> => {
    if (STATIC) {
      return {
        success: false,
        error: 'Editing molecules is not supported in the static build.',
      };
    }

    const result = await moleculeSource.editMolecule({
      originalName: data.originalName,
      moleculeName: data.moleculeName,
    });

    // Single-flight mutation, same rationale as uploadMolecule above.
    if (result.success) void listMoleculesQuery().refresh();
    return result;
  },
);

export const deleteMoleculeFile = command(
  deleteMoleculeFileSchema,
  async ({ id }): Promise<MutationResult> => {
    if (STATIC) {
      return {
        success: false,
        error: 'Deleting molecules is not supported in the static build.',
      };
    }

    const result = await moleculeSource.deleteMoleculeFile(id);
    if (result.success) void listMoleculesQuery().refresh();
    return result;
  },
);

export const deleteMolecule = command(
  deleteMoleculeSchema,
  async ({ originalName }): Promise<MutationResult> => {
    if (STATIC) {
      return {
        success: false,
        error: 'Deleting molecules is not supported in the static build.',
      };
    }

    const result = await moleculeSource.deleteMolecule(originalName);
    if (result.success) void listMoleculesQuery().refresh();
    return result;
  },
);

export const editMoleculeFileContents = command(
  editMoleculeFileContentsSchema,
  async ({ id, contents }): Promise<MutationResult> => {
    if (STATIC) {
      return {
        success: false,
        error: 'Editing molecules is not supported in the static build.',
      };
    }

    const result = await moleculeSource.editMoleculeFileContents({
      id,
      contents,
    });
    if (result.success) {
      // Contents changes re-derive the atom count (list) and rewrite the
      // cached file contents (detail) — refresh both in this flight.
      void listMoleculesQuery().refresh();
      void getMoleculeFileContentQuery(id).refresh();
    }
    return result;
  },
);

export const replaceMoleculeFile = form(
  replaceMoleculeFileSchema,
  async (data): Promise<MutationResult> => {
    if (STATIC) {
      return {
        success: false,
        error: 'Editing molecules is not supported in the static build.',
      };
    }

    const result = await moleculeSource.replaceMoleculeFile({
      id: data.id,
      file: data.file,
    });
    if (result.success) {
      // Same rationale as editMoleculeFileContents above.
      void listMoleculesQuery().refresh();
      void getMoleculeFileContentQuery(data.id).refresh();
    }
    return result;
  },
);
