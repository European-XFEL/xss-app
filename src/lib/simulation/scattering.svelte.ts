import { Throttled } from 'runed';

import { THROTTLE_INTERVAL_MS } from './constants';
import { ScatteringMathState } from './state.svelte';

/**
 * The slice of simulation state the scattering calculations read. Declared
 * structurally here so this feature does not depend on the app-level
 * composition root (`SimulationState` satisfies this shape).
 */
export interface ScatteringInputs {
  pump: {
    excitedStateFraction: number;
    photonEnergyEv: number;
    excitedStateEnergyEv: number;
  };
  sample: {
    concentrationSoluteMmol: number | null;
    solvent: { rhom: number; cpm: number } | null;
  };
}

export function createScatteringCalculations(
  simulation: ScatteringInputs,
): ScatteringMathState {
  const throttledExcitedStateFraction = new Throttled(
    () => simulation.pump.excitedStateFraction,
    THROTTLE_INTERVAL_MS,
  );
  const throttledPhotonEnergy = new Throttled(
    () => simulation.pump.photonEnergyEv,
    THROTTLE_INTERVAL_MS,
  );
  const throttledExcitedStateEnergy = new Throttled(
    () => simulation.pump.excitedStateEnergyEv,
    THROTTLE_INTERVAL_MS,
  );
  const throttledConcentrationSolute = new Throttled(
    () => simulation.sample.concentrationSoluteMmol,
    THROTTLE_INTERVAL_MS,
  );

  return new ScatteringMathState({
    concentrationSoluteMmol: () => throttledConcentrationSolute.current,
    excitedStateFraction: () => throttledExcitedStateFraction.current,
    photonEnergyEv: () => throttledPhotonEnergy.current,
    excitedStateEnergyEv: () => throttledExcitedStateEnergy.current,
    solventRhom: () => simulation.sample.solvent?.rhom,
    solventCpm: () => simulation.sample.solvent?.cpm,
  });
}

export { computeDeltaS, scaleSoluteByExcitedFraction } from './math';
