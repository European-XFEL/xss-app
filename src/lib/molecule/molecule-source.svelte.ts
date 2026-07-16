/**
 * Client-facing molecule data-access facade, build-time switched on
 * `PUBLIC_TARGET`.
 *
 * - `node` / `static`: delegate to the `molecule.remote` functions (server /
 *   prerender), the existing behavior.
 * - `local`: reads MERGE the prerendered demo set (canonical, read-only) with
 *   the user's IndexedDB uploads (`$lib/shared/molecule-store`); writes go to
 *   IndexedDB only. Demo molecules are never mutated.
 *
 * `listMolecules()` returns a reactive object matching the shape the dashboard
 * and samples pages consume from the remote query (`current` / `loading` /
 * `error` / `refresh`). In local mode it re-reads after every mutation so
 * uploads/edits/deletes reflect live, which the prerender-only remote cannot do.
 *
 * The form-backed mutations (upload/edit-file/edit-molecule/replace) are exposed
 * via `localWrites` for the dialog's client-only submit path; the dialog keeps
 * using the real `form()` objects from `molecule.remote` for field state and
 * validation (both work client-side) and only swaps the submit action.
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

const LOCAL = PUBLIC_TARGET === 'local';

// ─── Reactive merged list (local mode) ──────────────────────────────────────

type MoleculesQuery = {
  readonly current: MoleculeInfo[];
  readonly loading: boolean;
  readonly error: Error | null;
  refresh: () => Promise<void>;
};

// Lazily-created singleton. Kept out of module scope (no top-level `$state`)
// so this whole module — and its `molecule-store` import — tree-shakes out of
// the node/static bundles where `LOCAL` is false.
let query: MoleculesQuery | null = null;

function createQuery(): MoleculesQuery {
  let entries = $state<MoleculeInfo[]>([]);
  let loading = $state(true);
  let loadError = $state<Error | null>(null);
  let demoCache: MoleculeInfo[] | null = null;

  const reload = async (): Promise<void> => {
    loading = true;
    try {
      demoCache ??= await remoteListMolecules();
      const uploaded = await listStoredMolecules();
      entries = [...demoCache, ...uploaded];
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

function localMoleculesQuery(): MoleculesQuery {
  query ??= createQuery();
  return query;
}

/** Refresh the reactive list after a local mutation (no-op before first read). */
async function refreshList(): Promise<void> {
  await query?.refresh();
}

// ─── Local implementations ──────────────────────────────────────────────────
//
// Every store reference is reached ONLY through a `LOCAL ? … : …` assignment
// below. Rollup constant-folds that ternary (LOCAL is derived from the inlined
// PUBLIC_TARGET), so in node/static builds these functions are unreferenced and
// the whole `molecule-store` import tree-shakes out. A store call placed inside
// an `if (LOCAL)` function body would NOT fold and would leak the store into
// every bundle — hence this structure.

/** Run a store mutation, then refresh the reactive list on success. */
async function withRefresh<R extends MutationResult | UploadMoleculeResult>(
  op: Promise<R>,
): Promise<R> {
  const result = await op;
  if (result.success) await refreshList();
  return result;
}

async function localGetMoleculeFileContent(
  id: string,
): Promise<MoleculeFileContent> {
  const stored = await getStoredMoleculeContent(id);
  if (stored !== null) return { contents: stored };
  return remoteGetMoleculeFileContent(id); // prerendered demo file
}

// ─── Public facade ──────────────────────────────────────────────────────────

export const listMolecules = LOCAL ? localMoleculesQuery : remoteListMolecules;

export const getMoleculeFileContent = LOCAL
  ? localGetMoleculeFileContent
  : remoteGetMoleculeFileContent;

export const deleteMoleculeFile = LOCAL
  ? (input: { id: string }) => withRefresh(deleteStoredFile(input.id))
  : remoteDeleteMoleculeFile;

export const deleteMolecule = LOCAL
  ? (input: { originalName: string }) =>
      withRefresh(deleteStoredMolecule(input.originalName))
  : remoteDeleteMolecule;

export const editMoleculeFileContents = LOCAL
  ? (input: { id: string; contents: string }) =>
      withRefresh(updateStoredContents(input.id, input.contents))
  : remoteEditMoleculeFileContents;

/**
 * Local-only form-submit writes for the dialog. Bundled behind the `LOCAL`
 * ternary and null in other builds, so the store references tree-shake out even
 * though the dialog statically imports this binding.
 */
export const localWrites = LOCAL
  ? {
      upload: (input: UploadStoredMoleculeInput) =>
        withRefresh(uploadStoredMolecule(input)),
      editFile: (input: EditStoredFileInput) =>
        withRefresh(editStoredFile(input)),
      editMolecule: (input: { originalName: string; moleculeName: string }) =>
        withRefresh(
          renameStoredMolecule(input.originalName, input.moleculeName),
        ),
      replaceFile: async (input: { id: string; file: File }) =>
        withRefresh(
          updateStoredContents(
            input.id,
            await input.file.text(),
            input.file.name,
          ),
        ),
    }
  : null;
