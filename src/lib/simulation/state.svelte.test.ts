import { describe, expect, it } from 'vitest';

import {
  type ScatteringMathSources,
  ScatteringMathState,
} from './state.svelte';

function makeSources(
  overrides: Partial<{
    [K in keyof ScatteringMathSources]: ReturnType<ScatteringMathSources[K]>;
  }> = {},
): ScatteringMathSources {
  const values = {
    concentrationSoluteMolar: 0.1,
    excitedStateFraction: 0.5,
    photonEnergyEv: 3,
    excitedStateEnergyEv: 1,
    solventRhom: 55000,
    solventCpm: 75,
    ...overrides,
  };
  return {
    concentrationSoluteMolar: () => values.concentrationSoluteMolar,
    excitedStateFraction: () => values.excitedStateFraction,
    photonEnergyEv: () => values.photonEnergyEv,
    excitedStateEnergyEv: () => values.excitedStateEnergyEv,
    solventRhom: () => values.solventRhom,
    solventCpm: () => values.solventCpm,
  };
}

describe('ScatteringMathState', () => {
  it('derives concentrations and energies from its sources', () => {
    const state = new ScatteringMathState(makeSources());

    expect(state.concentrationSolvent).toBeCloseTo(55);
    expect(state.concentrationExcited).toBeCloseTo(0.05);
    expect(state.ratioSolventSolute).toBeCloseTo(550);
    expect(state.deltaEeV).toBe(2);
    expect(state.deltaEJ).toBeCloseTo(2 * 1.602176634e-19);
    expect(state.excitedStateFraction).toBe(0.5);
    expect(state.deltaT).toBeDefined();
  });

  it('re-derives values when the underlying sources change', () => {
    let soluteMolar: number | null = 0.1;
    const sources = makeSources();
    sources.concentrationSoluteMolar = () => soluteMolar;

    const state = new ScatteringMathState(sources);
    expect(state.concentrationExcited).toBeCloseTo(0.05);

    soluteMolar = 0.2;
    expect(state.concentrationExcited).toBeCloseTo(0.1);
  });

  it('defaults excitedStateFraction to 0 when the source is missing', () => {
    const state = new ScatteringMathState(
      makeSources({ excitedStateFraction: null }),
    );
    expect(state.excitedStateFraction).toBe(0);
  });

  it('leaves deltaT undefined when solvent heat capacity is missing', () => {
    const state = new ScatteringMathState(makeSources({ solventCpm: null }));
    expect(state.deltaT).toBeUndefined();
  });
});
