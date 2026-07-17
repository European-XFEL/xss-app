import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { QRange } from '$lib/shared/contracts';

import { computeDebyeIq } from './debye';
import { FORM_FACTOR_COEFFICIENTS } from './form-factor-coefficients';

/**
 * Shape of the JSON fixtures in `tests/fixtures/debye-parity/`, generated from
 * the current Python Debye implementation (see that directory's README).
 */
type ParityFixture = {
  name: string;
  source_file: string;
  n_atoms: number;
  elements: string[];
  xyz: [number, number, number][];
  q_range: QRange;
  q: number[];
  i: number[];
};

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../tests/fixtures/debye-parity',
);

// The Python reference runs float32 (torch default), so its q/i values carry
// only ~7 significant digits — exact equality is wrong. The epic design notes
// suggested < 1e-4; the port's own scratch validation observed max relative
// errors under 2e-6 across all six fixtures, so 1e-4 leaves ~50x headroom for
// float32 rounding while still catching any real regression in the kernel math.
const RELATIVE_TOLERANCE = 1e-4;

/**
 * Max relative error between two arrays, using |ref| in the denominator with a
 * small floor so near-zero reference values don't blow the ratio up. Returns the
 * worst offending index alongside the error for diagnosable failures.
 */
function maxRelativeError(
  actual: number[],
  expected: number[],
): { error: number; index: number; actual: number; expected: number } {
  let worst = { error: 0, index: -1, actual: 0, expected: 0 };
  const n = Math.min(actual.length, expected.length);
  for (let k = 0; k < n; k += 1) {
    const denom = Math.max(Math.abs(expected[k]), 1e-12);
    const err = Math.abs(actual[k] - expected[k]) / denom;
    if (err > worst.error) {
      worst = {
        error: err,
        index: k,
        actual: actual[k],
        expected: expected[k],
      };
    }
  }
  return worst;
}

const fixtures: ParityFixture[] = readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(FIXTURE_DIR, f), 'utf-8')));

describe('computeDebyeIq parity vs Python reference fixtures', () => {
  it('discovered all fixture files', () => {
    // Guard against a silent empty glob masking every parity assertion.
    expect(fixtures.length).toBeGreaterThanOrEqual(3);
  });

  for (const fx of fixtures) {
    it(`${fx.name} (${fx.n_atoms} atoms, ${fx.q.length} q-points)`, () => {
      const result = computeDebyeIq(fx.elements, fx.xyz, fx.q_range);

      expect(result.q).toHaveLength(fx.q.length);
      expect(result.i).toHaveLength(fx.i.length);

      const qErr = maxRelativeError(result.q, fx.q);
      const iErr = maxRelativeError(result.i, fx.i);

      // Attach the actual worst error so a regression reports a number, not a
      // diff of two 900-element arrays.
      expect(
        qErr.error,
        `q max rel err ${qErr.error.toExponential(3)} at index ${qErr.index} ` +
          `(got ${qErr.actual}, expected ${qErr.expected})`,
      ).toBeLessThan(RELATIVE_TOLERANCE);
      expect(
        iErr.error,
        `i max rel err ${iErr.error.toExponential(3)} at index ${iErr.index} ` +
          `(got ${iErr.actual}, expected ${iErr.expected})`,
      ).toBeLessThan(RELATIVE_TOLERANCE);
    });
  }
});

describe('computeDebyeIq edge cases', () => {
  it('uses half-open torch.arange q-grid (excludes exact endpoint)', () => {
    // (3.0 - 1.0) / 0.5 === 4 exactly. torch.arange gives 4 points [1,1.5,2,2.5],
    // NOT 5 — createQGrid's inclusive behavior would wrongly append 3.0.
    const result = computeDebyeIq(['H'], [[0, 0, 0]], {
      min: 1.0,
      max: 3.0,
      step: 0.5,
    });
    expect(result.q).toEqual([1.0, 1.5, 2.0, 2.5]);
  });

  // One atom => zero pairs => iq stays 0 through accumulatePairwise. The DW
  // factor then multiplies 0 (still 0, so biso is a no-op here), and only
  // addSelfScattering contributes f(q)^2/2. Hand-computed for H at q=1.0:
  //   f(1.0) = Σ a_k·exp(-b_k·(q/4π)^2) + c = 0.8734591246560935
  //   f^2/2  = 0.3814654212224946
  const singleAtomQRange: QRange = { min: 1.0, max: 1.5, step: 1.0 };

  it('single atom yields pure self-scattering f(q)^2/2', () => {
    const result = computeDebyeIq(['H'], [[0, 0, 0]], singleAtomQRange);
    expect(result.q).toEqual([1.0]);
    expect(result.i[0]).toBeCloseTo(0.3814654212224946, 12);

    // Sanity: the hardcoded expectation matches the module's own coefficients,
    // so this stays correct if the (frozen) H coefficients are ever edited.
    const { a, b, c } = FORM_FACTOR_COEFFICIENTS.H;
    const s2 = (1.0 / (4 * Math.PI)) ** 2;
    const f = a.reduce((acc, ak, k) => acc + ak * Math.exp(-b[k] * s2), c);
    expect((f * f) / 2).toBeCloseTo(result.i[0], 12);
  });

  it('single atom result is unaffected by Debye-Waller (biso is a no-op with zero pairs)', () => {
    const result = computeDebyeIq(['H'], [[0, 0, 0]], singleAtomQRange);
    const withBiso = computeDebyeIq(['H'], [[0, 0, 0]], singleAtomQRange, {
      biso: 5.0,
    });
    expect(withBiso.i[0]).toBe(result.i[0]);
  });

  it('empty structure returns a zero-filled i array of the correct length', () => {
    const result = computeDebyeIq([], [], { min: 0.5, max: 3.0, step: 0.5 });
    // Grid: ceil((3.0-0.5)/0.5) = 5 points.
    expect(result.q).toEqual([0.5, 1.0, 1.5, 2.0, 2.5]);
    expect(result.i).toEqual([0, 0, 0, 0, 0]);
  });
});
