import z from 'zod';

import {
  type DebyeResult,
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
  // Same cap as the upload/replace file paths — direct text edits must not
  // be able to smuggle in an oversized payload.
  contents: z
    .string()
    .min(1, 'Contents are required')
    .max(
      MAX_UPLOAD_FILE_BYTES,
      `Contents are too large; the maximum is ${Math.floor(MAX_UPLOAD_FILE_BYTES / 1024)} kB`,
    ),
});

export const replaceMoleculeFileSchema = z.object({
  id: idSchema,
  file: fileSchema,
});

// Hard cap on q-grid points: a degenerate tiny step can't request a giant
// array (DoS). Real grids are low thousands; 100k is comfortably above.
// ponytail: single consumer (this module) — move to contracts if the client
// pre-checks grid size too.
const MAX_Q_POINTS = 100_000;

/**
 * Q-grid point count for a qRange, matching the kernel's `torch.arange`
 * semantics (`createArangeQGrid` in `simulation/kernel/debye.ts`). Replicated,
 * not imported: `$lib/shared` importing the simulation feature would violate the
 * boundary rules. Keep in sync with that one-liner.
 */
function qGridCount(qRange: SimRequest['qRange']): number {
  return Math.max(0, Math.ceil((qRange.max - qRange.min) / qRange.step));
}

// Pinned to the `SimRequest` contract (the boundaries rules let server code
// import only $lib/shared/contracts, so the interface lives there and this
// schema is type-checked against it instead of being the type's source).
export const simulationSchema = z
  .object({
    fileId: z.string(),
    qRange: z.object({
      min: z.number().finite(),
      max: z.number().finite(),
      step: z.number().finite(),
    }),
  })
  .refine((r) => r.qRange.step > 0, {
    message: 'qRange.step must be > 0',
    path: ['qRange', 'step'],
  })
  .refine((r) => r.qRange.max >= r.qRange.min, {
    message: 'qRange.max must be >= qRange.min',
    path: ['qRange', 'max'],
  })
  .refine((r) => qGridCount(r.qRange) <= MAX_Q_POINTS, {
    message: `qRange implies more than ${MAX_Q_POINTS} q-points`,
    path: ['qRange'],
  }) satisfies z.ZodType<SimRequest>;

// Write-back for the shared Postgres Debye cache (node build): a client-computed
// result persisted for every user. The app is no-auth (like uploads), so the
// server can't recompute to verify the intensities without the very backend this
// bead removed. It CAN, however, reject anything malformed or inconsistent with
// the request: finite numbers, equal-length arrays, a length matching the
// requested q-grid, and q values on that grid. ponytail: this bounds the shape
// and ties the result to its key; a hostile client can still cache physically
// wrong `i` for a real fileId — re-add server recompute only if this stops being
// a trusted-user demo. (No non-negativity check: Debye I(Q) is ~0 / slightly
// negative near minima.)
export const cacheDebyeResultSchema = z
  .object({
    request: simulationSchema,
    result: z.object({
      q: z.array(z.number().finite()).max(MAX_Q_POINTS),
      i: z.array(z.number().finite()).max(MAX_Q_POINTS),
    }),
  })
  .refine((v) => v.result.q.length === v.result.i.length, {
    message: 'result.q and result.i must have equal length',
    path: ['result'],
  })
  .refine((v) => v.result.q.length === qGridCount(v.request.qRange), {
    message: 'result length must match the requested q-grid',
    path: ['result', 'q'],
  })
  .refine(
    (v) =>
      v.result.q.every((qk, k) => {
        const expected = v.request.qRange.min + k * v.request.qRange.step;
        return (
          Math.abs(qk - expected) <= 1e-6 * Math.max(1, Math.abs(expected))
        );
      }),
    {
      message: 'result.q must equal qRange.min + k*step',
      path: ['result', 'q'],
    },
  ) satisfies z.ZodType<{ request: SimRequest; result: DebyeResult }>;
