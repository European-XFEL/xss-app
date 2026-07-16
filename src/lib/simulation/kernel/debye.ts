import type { ScatteringSeries } from '../math';

import type { QRange } from '$lib/shared/contracts';

import {
  FORM_FACTOR_COEFFICIENTS,
  type FormFactorCoefficients,
} from './form-factor-coefficients';

/**
 * TypeScript port of the Debye scattering I(Q) kernel from the `debyecalculator`
 * Python package (the `.iq()` code path exercised by
 * `simex_debye_grpc.calculator.calc_debye`).
 *
 * Scope is exactly what that path exercises: xray radiation, occupancy 1.0 for
 * every atom (the `(elements, xyz)` tuple structure source never carries an
 * occupancy column), `include_self_scattering=True`, no partial masks, and
 * `rthres=0.0` (no pairs excluded). All other DebyeCalculator features (CIF /
 * ASE / pymatgen sources, nanoparticle generation, neutron radiation, S(Q) /
 * F(Q) / G(r), batching) are intentionally not ported.
 *
 * The reference runs float32 (torch default); this port uses float64 throughout
 * and is validated against the parity fixtures within ~1e-4 relative tolerance
 * (see `tests/fixtures/debye-parity/`).
 */

/** Debye-Waller isotropic displacement parameter; matches the Python default. */
const DEFAULT_BISO = 0.3;

export type DebyeParams = {
  /** Debye-Waller isotropic displacement parameter B_iso. Default 0.3. */
  biso?: number;
};

/**
 * Normalized sinc, matching `torch.sinc` / `numpy.sinc`:
 * `sinc(x) = sin(πx) / (πx)`, with `sinc(0) = 1`.
 *
 * Note this is NOT `Math.sin(x)/x` — the argument is pre-scaled by π.
 */
function sinc(x: number): number {
  if (x === 0) return 1;
  const piX = Math.PI * x;
  return Math.sin(piX) / piX;
}

/**
 * Build the q-grid matching `torch.arange(qmin, qmax, qstep)` semantics: a
 * half-open interval `[qmin, qmax)` with `ceil((qmax - qmin) / qstep)` points at
 * `qmin + i * qstep`.
 *
 * This deliberately does NOT reuse `createQGrid` from `../math`: that helper
 * uses `floor((max - min) / step) + 1` and a `<= max + step/2` filter, which
 * INCLUDES the endpoint when `(max - min) / step` is an exact integer, whereas
 * `torch.arange` excludes it. The two agree on the fixture ranges but diverge on
 * exact-endpoint ranges, so the kernel needs `arange` semantics specifically.
 */
function createArangeQGrid(qRange: QRange): number[] {
  const { min, max, step } = qRange;
  if (!(step > 0) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }

  const count = Math.max(0, Math.ceil((max - min) / step));
  const q = new Array<number>(count);
  for (let i = 0; i < count; i += 1) {
    q[i] = min + i * step;
  }
  return q;
}

/**
 * Evaluate the xray form factor for one element across the full q-grid:
 * `f(q) = Σ_k a[k] · exp(-b[k] · (q / 4π)²) + c`.
 *
 * Mirrors `form_factor_func` for the xray branch in `debye_calculator.py`.
 */
function evaluateFormFactor(
  coef: FormFactorCoefficients,
  qGrid: number[],
): Float64Array {
  const { a, b, c } = coef;
  const result = new Float64Array(qGrid.length);
  const fourPi = 4 * Math.PI;

  for (let qi = 0; qi < qGrid.length; qi += 1) {
    const s = qGrid[qi] / fourPi;
    const s2 = s * s;
    let sum = c;
    for (let k = 0; k < 5; k += 1) {
      sum += a[k] * Math.exp(-b[k] * s2);
    }
    result[qi] = sum;
  }
  return result;
}

/**
 * Per-structure data shared by the pairwise and self-scattering accumulators:
 * the q-grid, each atom's unique-element index, and the per-unique-element form
 * factors evaluated over the q-grid.
 */
type KernelContext = {
  xyz: [number, number, number][];
  inverse: number[];
  uniqueFormFactors: Float64Array[];
  qGrid: number[];
};

/**
 * Accumulate the pairwise Debye sum into `iq`.
 *
 * Iterates upper-triangle pairs (i < j) in row-major order — the same ordering
 * `torch.triu_indices(N, N, 1)` and `scipy.pdist` produce, so distances and
 * form-factor pairs stay aligned. occupancy is 1.0 for every atom and
 * rthres=0.0 excludes nothing, so both drop out of the sum.
 */
function accumulatePairwise(iq: Float64Array, ctx: KernelContext): void {
  const { xyz, inverse, uniqueFormFactors, qGrid } = ctx;
  const n = inverse.length;
  const nQ = qGrid.length;

  for (let i = 0; i < n; i += 1) {
    const [xi, yi, zi] = xyz[i];
    const ffI = uniqueFormFactors[inverse[i]];

    for (let j = i + 1; j < n; j += 1) {
      const dx = xi - xyz[j][0];
      const dy = yi - xyz[j][1];
      const dz = zi - xyz[j][2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const ffJ = uniqueFormFactors[inverse[j]];

      for (let qi = 0; qi < nQ; qi += 1) {
        // torch.sinc(d * q / π) === sin(d·q) / (d·q); pass d·q/π to match exactly.
        iq[qi] += ffI[qi] * ffJ[qi] * sinc((d * qGrid[qi]) / Math.PI);
      }
    }
  }
}

/**
 * Add the self-scattering contribution into `iq`.
 *
 * include_self_scattering=True with partial=None ⇒ every atom contributes
 * occupancy² · f_atom(q)² / 2, using each atom's OWN form factor.
 */
function addSelfScattering(iq: Float64Array, ctx: KernelContext): void {
  const { inverse, uniqueFormFactors, qGrid } = ctx;
  const nQ = qGrid.length;
  for (let i = 0; i < inverse.length; i += 1) {
    const ffI = uniqueFormFactors[inverse[i]];
    for (let qi = 0; qi < nQ; qi += 1) {
      iq[qi] += (ffI[qi] * ffI[qi]) / 2;
    }
  }
}

/**
 * Build the per-structure kernel context: the alphabetically-sorted unique
 * elements' form factors (mirrors `np.unique`) and each atom's index into that
 * unique list.
 */
function buildContext(
  elements: string[],
  xyz: [number, number, number][],
  qGrid: number[],
): KernelContext {
  const uniqueElements = Array.from(new Set(elements)).sort();
  const elementToUnique = new Map<string, number>();
  uniqueElements.forEach((el, idx) => elementToUnique.set(el, idx));
  const inverse = elements.map((el) => elementToUnique.get(el)!);

  const uniqueFormFactors = uniqueElements.map((el) => {
    const coef = FORM_FACTOR_COEFFICIENTS[el];
    if (!coef) {
      throw new Error(`No form-factor coefficients for element "${el}".`);
    }
    return evaluateFormFactor(coef, qGrid);
  });

  return { xyz, inverse, uniqueFormFactors, qGrid };
}

/**
 * Compute the Debye scattering intensity I(Q) for a molecular structure.
 *
 * @param elements Per-atom element symbols (length N).
 * @param xyz Per-atom Cartesian coordinates in Ångström (length N).
 * @param qRange Q-grid definition; interpreted with `torch.arange` semantics.
 * @param params Optional overrides (`biso`, default 0.3).
 * @returns The q-grid and I(Q) values as a {@link ScatteringSeries}.
 */
export function computeDebyeIq(
  elements: string[],
  xyz: [number, number, number][],
  qRange: QRange,
  params: DebyeParams = {},
): ScatteringSeries {
  const biso = params.biso ?? DEFAULT_BISO;

  const qGrid = createArangeQGrid(qRange);
  const nQ = qGrid.length;

  if (nQ === 0 || elements.length === 0) {
    return { q: qGrid, i: new Array<number>(nQ).fill(0) };
  }

  const iq = new Float64Array(nQ);
  const ctx = buildContext(elements, xyz, qGrid);

  accumulatePairwise(iq, ctx);

  // ── Debye-Waller isotropic displacement factor ────────────────────────────
  // Applied unconditionally: biso is 0.3 in this app (never 0).
  if (biso !== 0) {
    const denom = 8 * Math.PI * Math.PI;
    for (let qi = 0; qi < nQ; qi += 1) {
      const q = qGrid[qi];
      iq[qi] *= Math.exp((-q * q * biso) / denom);
    }
  }

  addSelfScattering(iq, ctx);

  return { q: qGrid, i: Array.from(iq) };
}
