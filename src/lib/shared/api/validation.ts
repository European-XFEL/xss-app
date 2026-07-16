import z from 'zod';

import {
  MAX_UPLOAD_ATOM_COUNT,
  MAX_UPLOAD_FILE_BYTES,
  type SimRequest,
} from '$lib/shared/contracts';

/**
 * Validation schema for remote functions taking a single entity id argument
 * (`getSolventIQ` in $lib/sample/solvent.remote, `getMoleculeFileContent` in
 * $lib/molecule/molecule.remote) — schemas cannot be exported from
 * `.remote.ts` files, hence this module.
 */
export const idSchema = z.string().min(1, 'Id is required');

// Field schemas shared between the molecule upload and edit forms.
const moleculeNameSchema = z
  .string()
  .trim()
  .min(1, 'Molecule name is required');
const descriptionSchema = z.string().trim().min(1, 'Description is required');
const stateSchema = z
  .number('State must be a non-negative integer')
  .int('State must be a non-negative integer')
  .min(0, 'State must be a non-negative integer');
const atomCountSchema = z
  .number('Atom count must be a positive integer')
  .int('Atom count must be a positive integer')
  .min(1, 'Atom count must be a positive integer')
  .max(
    MAX_UPLOAD_ATOM_COUNT,
    `Structure has too many atoms; the maximum is ${MAX_UPLOAD_ATOM_COUNT}`,
  );
const referenceSchema = z.string().optional();

// Shared by uploadMoleculeSchema and replaceMoleculeFileSchema.
const fileSchema = z
  .file('Please select a file')
  .max(
    MAX_UPLOAD_FILE_BYTES,
    `File is too large; the maximum is ${Math.floor(MAX_UPLOAD_FILE_BYTES / 1024)} kB`,
  );

/**
 * Validation schema for the molecule upload remote form
 * ($lib/molecule/molecule.remote). Shared between the server handler
 * (authoritative) and the component's `preflight` (client-side, friendly
 * errors before a roundtrip) — schemas cannot be exported from `.remote.ts`
 * files, hence this module.
 */
export const uploadMoleculeSchema = z.object({
  file: fileSchema,
  moleculeName: moleculeNameSchema,
  description: descriptionSchema,
  state: stateSchema,
  atomCount: atomCountSchema,
  reference: referenceSchema,
});

export type UploadInput = z.infer<typeof uploadMoleculeSchema>;

/**
 * Validation schema for editing a single structure file's metadata
 * (`editMoleculeFile` in $lib/molecule/molecule.remote).
 */
export const editMoleculeFileSchema = z.object({
  id: idSchema,
  filename: z.string().trim().min(1, 'Filename is required'),
  description: descriptionSchema,
  state: stateSchema,
  reference: referenceSchema,
});

/**
 * Validation schema for editing a molecule's header fields — the fields
 * shared by all of its structure files (`editMolecule` in
 * $lib/molecule/molecule.remote). Atom count is per-file derived data (see
 * `extractAtomCount` in db-source.ts) and not editable here.
 */
export const editMoleculeSchema = z.object({
  originalName: z.string().min(1, 'Original name is required'),
  moleculeName: moleculeNameSchema,
});

/**
 * Validation schemas for the delete/content-replace remote functions
 * ($lib/molecule/molecule.remote).
 */
export const deleteMoleculeFileSchema = z.object({ id: idSchema });

export const deleteMoleculeSchema = z.object({
  originalName: z.string().min(1, 'Original name is required'),
});

export const editMoleculeFileContentsSchema = z.object({
  id: idSchema,
  contents: z.string().min(1, 'Contents are required'),
});

export const replaceMoleculeFileSchema = z.object({
  id: idSchema,
  file: fileSchema,
});

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
