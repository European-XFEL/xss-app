import { describe, expect, it } from 'vitest';

import {
  computeConcentrationExcited,
  computeConcentrationSolvent,
  computeDeltaEJ,
  computeDeltaEeV,
  computeDeltaS,
  computeDeltaT,
  computeRatioSolventSolute,
  createQGrid,
  interpolateLinear,
  isPumpEnergyPhysical,
  isValidQRange,
  normalizeExcitedStateFraction,
  scaleSoluteByExcitedFraction,
} from './math';

describe('computeConcentrationSolvent', () => {
  it('treats mol/m3 as mMol/L', () => {
    expect(computeConcentrationSolvent(55000)).toBe(55000);
  });

  it('returns undefined for non-finite input', () => {
    expect(computeConcentrationSolvent(null)).toBeUndefined();
    expect(computeConcentrationSolvent(undefined)).toBeUndefined();
    expect(computeConcentrationSolvent(Number.NaN)).toBeUndefined();
  });
});

describe('computeConcentrationExcited', () => {
  it('multiplies solute concentration by excited fraction', () => {
    expect(computeConcentrationExcited(0.1, 0.5)).toBeCloseTo(0.05);
  });

  it('returns undefined when either input is missing', () => {
    expect(computeConcentrationExcited(null, 0.5)).toBeUndefined();
    expect(computeConcentrationExcited(0.1, null)).toBeUndefined();
  });
});

describe('computeRatioSolventSolute', () => {
  it('divides solvent concentration by solute concentration', () => {
    expect(computeRatioSolventSolute(55000, 100)).toBeCloseTo(550);
  });

  it('returns undefined when solute concentration is zero or missing', () => {
    expect(computeRatioSolventSolute(55, 0)).toBeUndefined();
    expect(computeRatioSolventSolute(55, null)).toBeUndefined();
  });

  it('returns undefined when solvent concentration is missing', () => {
    expect(computeRatioSolventSolute(null, 0.1)).toBeUndefined();
  });
});

describe('computeDeltaEeV / computeDeltaEJ', () => {
  it('computes the photon/excited-state energy gap', () => {
    expect(computeDeltaEeV(3, 1)).toBe(2);
  });

  it('returns 0 when either energy is missing', () => {
    expect(computeDeltaEeV(null, 1)).toBe(0);
    expect(computeDeltaEeV(3, null)).toBe(0);
  });

  it('clamps an unphysical negative gap to 0', () => {
    expect(computeDeltaEeV(1, 2)).toBe(0);
  });

  it('converts eV to Joules', () => {
    expect(computeDeltaEJ(1)).toBeCloseTo(1.602176634e-19);
  });
});

describe('isPumpEnergyPhysical', () => {
  it('accepts photon energy at or above the excited-state energy', () => {
    expect(isPumpEnergyPhysical(3, 1)).toBe(true);
    expect(isPumpEnergyPhysical(2, 2)).toBe(true);
  });

  it('rejects photon energy below the excited-state energy', () => {
    expect(isPumpEnergyPhysical(1, 2)).toBe(false);
  });

  it('treats missing energies as physical', () => {
    expect(isPumpEnergyPhysical(null, 2)).toBe(true);
    expect(isPumpEnergyPhysical(3, undefined)).toBe(true);
  });
});

describe('computeDeltaT', () => {
  it('returns undefined when any required input is missing or invalid', () => {
    expect(computeDeltaT(undefined, 1, 1, 1)).toBeUndefined();
    expect(computeDeltaT(1, undefined, 1, 1)).toBeUndefined();
    expect(computeDeltaT(1, 1, undefined, 1)).toBeUndefined();
    expect(computeDeltaT(1, 1, 1, 0)).toBeUndefined();
    expect(computeDeltaT(1, 1, 1, null)).toBeUndefined();
  });

  it('computes the temperature rise from the physical model', () => {
    const concentrationExcited = 0.05;
    const concentrationSolvent = 55;
    const deltaEJ = 1e-19;
    const solventCpm = 75;
    const result = computeDeltaT(
      concentrationExcited,
      concentrationSolvent,
      deltaEJ,
      solventCpm,
    );
    const expected =
      (concentrationExcited / concentrationSolvent) *
      (deltaEJ / solventCpm) *
      6.02214076e23;
    expect(result).toBeCloseTo(expected);
  });
});

describe('normalizeExcitedStateFraction', () => {
  it('defaults to 0 when missing', () => {
    expect(normalizeExcitedStateFraction(null)).toBe(0);
    expect(normalizeExcitedStateFraction(undefined)).toBe(0);
  });

  it('passes through a provided value', () => {
    expect(normalizeExcitedStateFraction(0.3)).toBe(0.3);
  });
});

describe('isValidQRange', () => {
  it('accepts a well-formed range', () => {
    expect(isValidQRange({ min: 0, max: 1, step: 0.1 })).toBe(true);
  });

  it('rejects a non-positive step', () => {
    expect(isValidQRange({ min: 0, max: 1, step: 0 })).toBe(false);
    expect(isValidQRange({ min: 0, max: 1, step: -0.1 })).toBe(false);
  });

  it('rejects max < min', () => {
    expect(isValidQRange({ min: 1, max: 0, step: 0.1 })).toBe(false);
  });

  it('rejects non-finite values', () => {
    expect(isValidQRange({ min: 0, max: Number.NaN, step: 0.1 })).toBe(false);
  });
});

describe('createQGrid', () => {
  it('builds an evenly spaced grid inclusive of max', () => {
    expect(createQGrid({ min: 0, max: 1, step: 0.5 })).toEqual([0, 0.5, 1]);
  });

  it('returns an empty array for an invalid range', () => {
    expect(createQGrid({ min: 1, max: 0, step: 0.1 })).toEqual([]);
  });
});

describe('interpolateLinear', () => {
  it('linearly interpolates between known points', () => {
    const result = interpolateLinear([0, 1, 2], [0, 10, 20], [0.5, 1.5]);
    expect(result[0]).toBeCloseTo(5);
    expect(result[1]).toBeCloseTo(15);
  });

  it('returns NaN outside the domain when clamp is not set', () => {
    const result = interpolateLinear([0, 1], [0, 10], [-1, 2]);
    expect(result[0]).toBeNaN();
    expect(result[1]).toBeNaN();
  });

  it('clamps to the boundary values when clamp is set', () => {
    const result = interpolateLinear([0, 1], [0, 10], [-1, 2], {
      clamp: true,
    });
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(10);
  });

  it('throws when x and y lengths do not match', () => {
    expect(() => interpolateLinear([0, 1], [0], [0.5])).toThrow();
  });

  it('returns NaN-filled array when x is empty', () => {
    expect(interpolateLinear([], [], [0.5])).toEqual([Number.NaN]);
  });
});

describe('computeDeltaS', () => {
  it('combines solute and solvent series, scaling solute by excited fraction', () => {
    const solute = { q: [1, 2], i: [10, 20] };
    const solvent = { q: [1, 2], i: [1, 2] };
    expect(computeDeltaS(solute, solvent, 0.5)).toEqual({
      q: [1, 2],
      i: [6, 12],
    });
  });

  it('returns null when either series is missing', () => {
    expect(computeDeltaS(null, { q: [1], i: [1] }, 0.5)).toBeNull();
    expect(computeDeltaS({ q: [1], i: [1] }, null, 0.5)).toBeNull();
  });

  it('returns null when q grids have mismatched lengths', () => {
    const solute = { q: [1, 2], i: [10, 20] };
    const solvent = { q: [1], i: [1] };
    expect(computeDeltaS(solute, solvent, 0.5)).toBeNull();
  });
});

describe('scaleSoluteByExcitedFraction', () => {
  it('scales each value by the excited fraction', () => {
    expect(scaleSoluteByExcitedFraction({ q: [1], i: [10, 20] }, 0.5)).toEqual([
      5, 10,
    ]);
  });

  it('returns null when the series is missing', () => {
    expect(scaleSoluteByExcitedFraction(null, 0.5)).toBeNull();
  });
});
