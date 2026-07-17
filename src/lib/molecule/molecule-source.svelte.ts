/**
 * Client-facing molecule data-access facade.
 *
 * Two storage backends, chosen per call:
 * - Postgres (remote functions in `molecule.remote`) — the `node` default.
 * - client IndexedDB (`$lib/shared/molecule-store`) merged with the read-only
 *   public/demo set — the `static` build always, and the `node` build when the
 *   backendless-storage Settings toggle is on (`useClientStorage`).
 *
 * The `static` build is decided at build time: `STATIC` is a constant (inlined
 * `PUBLIC_TARGET`), so its guard const-folds and the Postgres/remote-write
 * branches dead-code-eliminate out of the static bundle. The `node` build keeps
 * both paths and picks at runtime.
 *
 * In client-storage mode, reads MERGE the read-only public molecules (Postgres
 * on node, prerendered demo on static — both via `molecule.remote`) with the
 * user's IndexedDB uploads; writes go to IndexedDB only. Public molecules are
 * never mutated, and nothing is ever written to Postgres.
 */
import { PUBLIC_TARGET } from '$app/env/public';

import {
  deleteMolecule as remoteDeleteMolecule,
  deleteMoleculeFile as remoteDeleteMoleculeFile,
  editMoleculeFileContents as remoteEditMoleculeFileContents,
  getMoleculeFileContent as remoteGetMoleculeFileContent,
  listMolecules as remoteListMolecules,
} from '$lib/molecule/molecule.remote';
import type {
  MoleculeFileContent,
  MoleculeInfo,
  MutationResult,
  UploadMoleculeResult,
} from '$lib/shared/contracts';
import {
  type EditStoredFileInput,
  type UploadStoredMoleculeInput,
  deleteStoredFile,
  deleteStoredMolecule,
  editStoredFile,
  getStoredMoleculeContent,
  listStoredMolecules,
  renameStoredMolecule,
  updateStoredContents,
  uploadStoredMolecule,
} from '$lib/shared/molecule-store';
import { useClientStorage } from '$lib/shared/storage-mode';

// `true` on the static build — a build-time constant, so the `else` (remote)
// branch of every `if (STATIC)` below tree-shakes out of the static bundle.
const STATIC = PUBLIC_TARGET === 'static';

// ─── Reactive merged list (client-storage mode) ─────────────────────────────

type MoleculesQuery = {
  readonly current: MoleculeInfo[];
  readonly loading: boolean;
  readonly error: Error | null;
  refresh: () => Promise<void>;
};

// Single reactive store for client-storage mode, created on first read. Kept as
// a module singleton so the write helpers below can refresh the same instance
// the dashboard/samples pages are rendering.
let clientQuery: MoleculesQuery | null = null;

function createClientQuery(): MoleculesQuery {
  let entries = $state<MoleculeInfo[]>([]);
  let loading = $state(true);
  let loadError = $state<Error | null>(null);

  const reload = async (): Promise<void> => {
    loading = true;
    try {
      const [publicMolecules, uploaded] = await Promise.all([
        remoteListMolecules(), // read-only public set (Postgres / prerendered demo)
        listStoredMolecules(), // user IndexedDB uploads
      ]);
      entries = [...publicMolecules, ...uploaded];
      loadError = null;
    } catch (err) {
      loadError =
        err instanceof Error ? err : new Error('Failed to load molecules');
    } finally {
      loading = false;
    }
  };

  void reload();

  return {
    get current() {
      return entries;
    },
    get loading() {
      return loading;
    },
    get error() {
      return loadError;
    },
    refresh: reload,
  };
}

function clientMoleculesQuery(): MoleculesQuery {
  return (clientQuery ??= createClientQuery());
}

/** Run a client-store mutation, then refresh the reactive list on success. */
async function withRefresh<R extends MutationResult | UploadMoleculeResult>(
  op: Promise<R>,
): Promise<R> {
  const result = await op;
  if (result.success) await clientQuery?.refresh();
  return result;
}

async function clientGetMoleculeFileContent(
  id: string,
): Promise<MoleculeFileContent> {
  const stored = await getStoredMoleculeContent(id);
  if (stored !== null) return { contents: stored };
  return remoteGetMoleculeFileContent(id); // read-only public file
}

// ─── Public facade ──────────────────────────────────────────────────────────
//
// Each function routes to the client store when storage is client-side
// (`STATIC` at build time, or the runtime toggle on node) and to the Postgres
// remote otherwise. The leading `if (STATIC)` const-folds so the remote branch
// tree-shakes from the static bundle (see bd-3 spike).

// Return type inferred as the union of the client store and the remote query
// resource; both expose `current`/`loading`/`error`/`refresh`, which is all the
// dashboard/samples pages read (they already tolerate `current` being undefined
// before the first load).
export function listMolecules() {
  if (STATIC) return clientMoleculesQuery();
  return useClientStorage() ? clientMoleculesQuery() : remoteListMolecules();
}

export function getMoleculeFileContent(
  id: string,
): Promise<MoleculeFileContent> {
  if (STATIC) return clientGetMoleculeFileContent(id);
  return useClientStorage()
    ? clientGetMoleculeFileContent(id)
    : remoteGetMoleculeFileContent(id);
}

export function deleteMoleculeFile(input: {
  id: string;
}): Promise<MutationResult> {
  if (STATIC) return withRefresh(deleteStoredFile(input.id));
  return useClientStorage()
    ? withRefresh(deleteStoredFile(input.id))
    : remoteDeleteMoleculeFile(input);
}

export function deleteMolecule(input: {
  originalName: string;
}): Promise<MutationResult> {
  if (STATIC) return withRefresh(deleteStoredMolecule(input.originalName));
  return useClientStorage()
    ? withRefresh(deleteStoredMolecule(input.originalName))
    : remoteDeleteMolecule(input);
}

export function editMoleculeFileContents(input: {
  id: string;
  contents: string;
}): Promise<MutationResult> {
  if (STATIC)
    return withRefresh(updateStoredContents(input.id, input.contents));
  return useClientStorage()
    ? withRefresh(updateStoredContents(input.id, input.contents))
    : remoteEditMoleculeFileContents(input);
}

/**
 * Client-store form-submit writes, used by the dialog when `useClientStorage()`
 * is true. On node with Postgres storage the dialog uses the `molecule.remote`
 * forms directly instead; both paths share one `.enhance()` seam (see
 * `makeEnhance` in MoleculeFormDialog.svelte).
 */
export const clientWrites = {
  upload: (input: UploadStoredMoleculeInput) =>
    withRefresh(uploadStoredMolecule(input)),
  editFile: (input: EditStoredFileInput) => withRefresh(editStoredFile(input)),
  editMolecule: (input: { originalName: string; moleculeName: string }) =>
    withRefresh(renameStoredMolecule(input.originalName, input.moleculeName)),
  replaceFile: async (input: { id: string; file: File }) =>
    withRefresh(
      updateStoredContents(input.id, await input.file.text(), input.file.name),
    ),
};
