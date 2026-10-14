import { describe, expect, it } from 'vitest';

import { cacheDebyeResultSchema, uploadMoleculeSchema } from './validation';

// The Debye write-back caches a CLIENT-computed result into the shared Postgres
// cache (no-auth app). The server can't recompute to verify intensities, so the
// schema does every consistency check it can: finite numbers, equal-length
// arrays, length matching the requested q-grid, q on that grid, and a size cap.

// q-grid for {0, 1, 0.5} is arange(0,1,0.5) = [0, 0.5] → 2 points.
const request = { fileId: 'abc', qRange: { min: 0, max: 1, step: 0.5 } };
const ok = (input: unknown) => cacheDebyeResultSchema.safeParse(input).success;

const rejected: Record<string, unknown> = {
  'NaN intensity': { request, result: { q: [0, 0.5], i: [10, Number.NaN] } },
  'Infinity intensity': {
    request,
    result: { q: [0, 0.5], i: [10, Number.POSITIVE_INFINITY] },
  },
  'q/i length mismatch': { request, result: { q: [0, 0.5], i: [10] } },
  'length ≠ q-grid count': {
    request,
    result: { q: [0, 0.5, 1], i: [1, 2, 3] },
  },
  'q off the grid': { request, result: { q: [0, 0.7], i: [10, 5] } },
  'step <= 0': {
    request: { fileId: 'abc', qRange: { min: 0, max: 1, step: 0 } },
    result: { q: [], i: [] },
  },
  'grid exceeds point cap': {
    // (1 - 0) / 1e-9 ≈ 1e9 points, far above MAX_Q_POINTS.
    request: { fileId: 'abc', qRange: { min: 0, max: 1, step: 1e-9 } },
    result: { q: [0], i: [0] },
  },
};

describe('cacheDebyeResultSchema', () => {
  it('accepts a finite result on the requested grid', () => {
    expect(ok({ request, result: { q: [0, 0.5], i: [10, 5] } })).toBe(true);
  });

  for (const [name, input] of Object.entries(rejected)) {
    it(`rejects ${name}`, () => expect(ok(input)).toBe(false));
  }
});

// One upload carries every structure state (ground + excited) for a molecule;
// each structure is validated on its own.
describe('uploadMoleculeSchema', () => {
  const structure = {
    file: new File(['2\n\nH 0 0 0\nH 0 0 1\n'], 'a.xyz'),
    atomCount: 2,
  };
  const base = { moleculeName: 'Water', description: 'd' };
  const valid = (structures: unknown[]) =>
    uploadMoleculeSchema.safeParse({ ...base, structures }).success;

  it('accepts a ground + excited pair', () => {
    expect(valid([structure, structure])).toBe(true);
  });

  it('rejects a single structure', () => {
    expect(valid([structure])).toBe(false);
  });

  it('rejects when either structure is invalid', () => {
    expect(valid([structure, { ...structure, atomCount: 0 }])).toBe(false);
    expect(valid([{ atomCount: 2 }, structure])).toBe(false);
  });
});
