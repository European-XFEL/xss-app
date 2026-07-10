/**
 * Remote form for uploading a molecule
 * (https://svelte.dev/docs/kit/remote-functions#form).
 *
 * Replaces the hand-rolled POST /api/upload flow for MoleculeUpload.svelte:
 * schema validation (shared with the client preflight) happens before the
 * handler runs, and the handler returns the same UploadMoleculeResult shape
 * the previous endpoint produced.
 */
import { PUBLIC_TARGET } from '$app/env/public';
import { form } from '$app/server';

import { moleculeSource } from '$lib/server/data';
import { uploadMoleculeSchema } from '$lib/shared/api/validation';
import type { UploadMoleculeResult } from '$lib/shared/contracts';

const STATIC = PUBLIC_TARGET === 'static';

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

    return await moleculeSource.uploadMolecule({
      moleculeName: data.moleculeName,
      description: data.description,
      state: data.state,
      reference: data.reference?.trim() ? data.reference.trim() : null,
      atomCount: data.atomCount,
      file: data.file,
    });
  },
);
