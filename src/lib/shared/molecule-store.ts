/**
 * Client-side molecule store for backendless (client) storage: the `static`
 * build always, and the `node` build when the backendless-storage toggle is on.
 *
 * A backendless IndexedDB store (via idb-keyval) that holds user-uploaded
 * structure files and their metadata, mirroring the CRUD semantics of
 * `dbMoleculeSource` (`$lib/server/data/db-source`). It lives in `$lib/shared`
 * rather than the molecule feature because both the molecule feature (CRUD) and
 * the simulation feature (reading contents to compute I(Q)) need it, and a
 * cross-feature value import would violate the project's boundary rules.
 *
 * The demo molecule set is NOT stored here — it stays canonical in the
 * prerendered read remotes and is merged in at the facade layer
 * (`$lib/molecule/molecule-source`). This store only ever holds the user's own
 * uploads, so its records are always editable (`readOnly: false`).
 *
 * All keys live in idb-keyval's default store, prefixed:
 * - `molidx`         → `string[]` of uploaded molecule ids (list ordering)
 * - `mol:<id>`       → `MoleculeInfo`
 * - `molc:<id>`      → structure file contents (string)
 * - `sim:<id>:...`   → cached Debye results, written by `simulation-local`
 *   (see {@link SIM_CACHE_PREFIX}); cleared here when contents change or a file
 *   is removed, mirroring db-source dropping cached intensities.
 */
import { del, delMany, get, getMany, keys, set } from 'idb-keyval';

import { deriveAtomCount } from './atom-count';
import type {
  MoleculeInfo,
  MutationResult,
  UploadMoleculeResult,
} from './contracts';
import { sha256Hex } from './sha256';

const INDEX_KEY = 'molidx';
const infoKey = (id: string) => `mol:${id}`;
const contentsKey = (id: string) => `molc:${id}`;

/**
 * Prefix of the simulation-result cache keys owned by
 * `$lib/simulation/simulation-local`. Duplicated here (not imported) to keep
 * this shared module free of a feature dependency; kept in sync with that
 * module's `cacheKey`.
 */
const SIM_CACHE_PREFIX = 'sim:';

/** Structure files plus the shared metadata needed to persist a new upload. */
export interface UploadStoredMoleculeInput {
  moleculeName: string;
  description: string;
  reference: string | null;
  structures: { state: number; atomCount: number; file: File }[];
}

export interface EditStoredFileInput {
  id: string;
  filename: string;
  description: string;
  state: number;
  reference: string | null;
}

async function readIndex(): Promise<string[]> {
  return (await get<string[]>(INDEX_KEY)) ?? [];
}

async function writeIndex(ids: string[]): Promise<void> {
  await set(INDEX_KEY, ids);
}

/** Remove every cached simulation result for the given file ids. */
async function clearSimCache(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const prefixes = ids.map((id) => `${SIM_CACHE_PREFIX}${id}:`);
  const allKeys = await keys();
  const stale = allKeys.filter(
    (k) => typeof k === 'string' && prefixes.some((p) => k.startsWith(p)),
  );
  if (stale.length > 0) await delMany(stale);
}

/** All uploaded molecules, in insertion order. */
export async function listStoredMolecules(): Promise<MoleculeInfo[]> {
  const ids = await readIndex();
  if (ids.length === 0) return [];
  const infos = await getMany<MoleculeInfo>(ids.map(infoKey));
  return infos.filter((info): info is MoleculeInfo => info != null);
}

/** Contents of an uploaded file, or null if the id is not in this store. */
export async function getStoredMoleculeContent(
  id: string,
): Promise<string | null> {
  return (await get<string>(contentsKey(id))) ?? null;
}

export async function uploadStoredMolecule(
  input: UploadStoredMoleculeInput,
): Promise<UploadMoleculeResult> {
  const ids = await readIndex();
  const existing = await getMany<MoleculeInfo>(ids.map(infoKey));
  const seen = new Set(existing.map((info) => info?.sha));

  // Validate every structure before writing any, so a bad one stores nothing.
  const prepared = [];
  for (const { file, state, atomCount } of input.structures) {
    const contents = await file.text();
    const derived = deriveAtomCount(contents, atomCount);
    if (!derived.ok)
      return { success: false, results: null, error: derived.error };
    const sha = await sha256Hex(contents);
    if (seen.has(sha)) {
      return {
        success: false,
        results: null,
        error: 'A structure file with identical contents already exists.',
      };
    }
    seen.add(sha);
    const info: MoleculeInfo = {
      id: crypto.randomUUID(),
      filename: file.name,
      sha,
      moleculeName: input.moleculeName,
      description: input.description,
      state,
      reference: input.reference,
      atomCount: derived.atomCount,
      readOnly: false,
      createdAt: new Date(),
      updatedAt: undefined,
    };
    prepared.push({ info, contents });
  }

  for (const { info, contents } of prepared) {
    await set(infoKey(info.id), info);
    await set(contentsKey(info.id), contents);
  }
  await writeIndex([...ids, ...prepared.map((p) => p.info.id)]);

  return { success: true, results: prepared.map((p) => p.info) };
}

/** Load an uploaded file's metadata, or a not-found MutationResult. */
async function requireInfo(
  id: string,
): Promise<
  { ok: true; info: MoleculeInfo } | { ok: false; result: MutationResult }
> {
  const info = await get<MoleculeInfo>(infoKey(id));
  if (!info) {
    return {
      ok: false,
      result: { success: false, error: 'Structure file not found.' },
    };
  }
  return { ok: true, info };
}

export async function editStoredFile(
  input: EditStoredFileInput,
): Promise<MutationResult> {
  const found = await requireInfo(input.id);
  if (!found.ok) return found.result;

  await set(infoKey(input.id), {
    ...found.info,
    filename: input.filename,
    description: input.description,
    state: input.state,
    reference: input.reference,
    updatedAt: new Date(),
  });
  return { success: true };
}

export async function renameStoredMolecule(
  originalName: string,
  moleculeName: string,
): Promise<MutationResult> {
  const molecules = await listStoredMolecules();
  const matching = molecules.filter((m) => m.moleculeName === originalName);
  if (matching.length === 0) {
    return { success: false, error: 'Molecule not found.' };
  }

  const now = new Date();
  await Promise.all(
    matching.map((m) =>
      set(infoKey(m.id), { ...m, moleculeName, updatedAt: now }),
    ),
  );
  return { success: true };
}

async function removeIds(ids: string[]): Promise<void> {
  await Promise.all(
    ids.flatMap((id) => [del(infoKey(id)), del(contentsKey(id))]),
  );
  const remaining = (await readIndex()).filter((id) => !ids.includes(id));
  await writeIndex(remaining);
  await clearSimCache(ids);
}

export async function deleteStoredFile(id: string): Promise<MutationResult> {
  const found = await requireInfo(id);
  if (!found.ok) return found.result;
  await removeIds([id]);
  return { success: true };
}

export async function deleteStoredMolecule(
  originalName: string,
): Promise<MutationResult> {
  const molecules = await listStoredMolecules();
  const ids = molecules
    .filter((m) => m.moleculeName === originalName)
    .map((m) => m.id);
  if (ids.length === 0) {
    return { success: false, error: 'Molecule not found.' };
  }
  await removeIds(ids);
  return { success: true };
}

/**
 * Recompute sha/atomCount for new contents, persist them (and `filename` when
 * given), and drop the file's cached simulation results — mirroring
 * `updateFileContents` in db-source.ts.
 */
export async function updateStoredContents(
  id: string,
  contents: string,
  filename?: string,
): Promise<MutationResult> {
  const found = await requireInfo(id);
  if (!found.ok) return found.result;

  const derived = deriveAtomCount(contents);
  if (!derived.ok) return { success: false, error: derived.error };

  await set(infoKey(id), {
    ...found.info,
    sha: await sha256Hex(contents),
    atomCount: derived.atomCount,
    ...(filename ? { filename } : {}),
    updatedAt: new Date(),
  });
  await set(contentsKey(id), contents);
  await clearSimCache([id]);
  return { success: true };
}
