import z from 'zod';

import {
  MAX_UPLOAD_ATOM_COUNT,
  MAX_UPLOAD_FILE_BYTES,
  type SimRequest,
} from '$lib/shared/contracts';

/**
 * Validation schema for the molecule upload remote form
 * ($lib/molecule/molecule.remote). Shared between the server handler
 * (authoritative) and the component's `preflight` (client-side, friendly
 * errors before a roundtrip) — schemas cannot be exported from `.remote.ts`
 * files, hence this module.
 */
export const uploadMoleculeSchema = z.object({
  file: z
    .file('Please select a file')
    .max(
      MAX_UPLOAD_FILE_BYTES,
      `File is too large; the maximum is ${Math.floor(MAX_UPLOAD_FILE_BYTES / 1024)} kB`,
    ),
  moleculeName: z.string().trim().min(1, 'Molecule name is required'),
  description: z.string().trim().min(1, 'Description is required'),
  state: z
    .number('State must be a non-negative integer')
    .int('State must be a non-negative integer')
    .min(0, 'State must be a non-negative integer'),
  atomCount: z
    .number('Atom count must be a positive integer')
    .int('Atom count must be a positive integer')
    .min(1, 'Atom count must be a positive integer')
    .max(
      MAX_UPLOAD_ATOM_COUNT,
      `Structure has too many atoms; the maximum is ${MAX_UPLOAD_ATOM_COUNT}`,
    ),
  reference: z.string().optional(),
});

export type UploadInput = z.infer<typeof uploadMoleculeSchema>;

export const feedbackCategories = [
  'Content',
  'Interface',
  'Bug',
  'Suggestion',
] as const;

export const feedbackSchema = z.object({
  url: z.string().url(),
  comment: z.string().trim().max(2000).optional(),
  categories: z
    .array(z.enum(feedbackCategories))
    .optional()
    .transform((value) => value ?? []),
  region: z.string().optional(),
  regionImage: z.string().optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

// Pinned to the `SimRequest` contract (the boundaries rules let server code
// import only $lib/shared/contracts, so the interface lives there and this
// schema is type-checked against it instead of being the type's source).
export const simulationSchema = z.object({
  fileId: z.string(),
  qRange: z.object({
    min: z.number(),
    max: z.number(),
    step: z.number(),
  }),
}) satisfies z.ZodType<SimRequest>;

/**
 * Validation schema for remote functions taking a single entity id argument
 * (`getSolventIQ` in $lib/sample/solvent.remote, `getMoleculeFileContent` in
 * $lib/molecule/molecule.remote) — schemas cannot be exported from
 * `.remote.ts` files, hence this module.
 */
export const idSchema = z.string().min(1, 'Id is required');
