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
 * `getMoleculeFileContent` follows `$lib/sample/solvent.remote` exactly: a
 * given id's contents never change (uploads create new ids), so `prerender`
 * is safe on every target. See that module's doc comment for why `inputs` is
 * gated behind the static target (kit prerender-queue race, initial-dev-a69)
 * and why `dynamic: true` is needed for ids that didn't exist at build time.
 */
import * as Sentry from '@sentry/sveltekit';

import { PUBLIC_TARGET } from '$app/env/public';
import { form, prerender, query } from '$app/server';

import { moleculeSource } from '$lib/server/data';
import { idSchema, uploadMoleculeSchema } from '$lib/shared/api/validation';
import type { UploadMoleculeResult } from '$lib/shared/contracts';

const STATIC = PUBLIC_TARGET === 'static';

const listMoleculesQuery = query(async () => {
  return await moleculeSource.listMolecules();
});

export const listMolecules = STATIC
  ? prerender(async () => {
      return await moleculeSource.listMolecules();
    })
  : listMoleculesQuery;

// The underlying data source (db-source.ts / static-source.ts) already
// throws a proper `error(404, 'Molecule not found')` for an unknown id, so
// it propagates as-is — no extra try/catch needed here.
export const getMoleculeFileContent = prerender(
  idSchema,
  async (id) => {
    return await moleculeSource.getMoleculeFileContent(id);
  },
  {
    dynamic: true,
    inputs: STATIC
      ? async () => {
          const molecules = await moleculeSource.listMolecules();
          return molecules.map((molecule) => molecule.id);
        }
      : undefined,
  },
);

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
