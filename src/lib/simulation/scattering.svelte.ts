import { throttled } from '$lib/shared/utils/throttled.svelte';

import { THROTTLE_INTERVAL_MS } from './constants';
import {
  type ScatteringMathSources,
  ScatteringMathState,
} from './state.svelte';

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
    concentrationSoluteMolar: number | null;
    solvent: { rhom: number; cpm: number } | null;
  };
}

export function createScatteringCalculations(
  simulation: ScatteringInputs,
): ScatteringMathState {
  const throttledExcitedStateFraction = throttled(
    () => simulation.pump.excitedStateFraction,
    THROTTLE_INTERVAL_MS,
  );
  const throttledPhotonEnergy = throttled(
    () => simulation.pump.photonEnergyEv,
    THROTTLE_INTERVAL_MS,
  );
  const throttledExcitedStateEnergy = throttled(
    () => simulation.pump.excitedStateEnergyEv,
    THROTTLE_INTERVAL_MS,
  );
  const throttledConcentrationSolute = throttled(
    () => simulation.sample.concentrationSoluteMolar,
    THROTTLE_INTERVAL_MS,
  );

  return new ScatteringMathState({
    concentrationSoluteMolar: () => throttledConcentrationSolute.current,
    excitedStateFraction: () => throttledExcitedStateFraction.current,
    photonEnergyEv: () => throttledPhotonEnergy.current,
    excitedStateEnergyEv: () => throttledExcitedStateEnergy.current,
    solventRhom: () => simulation.sample.solvent?.rhom,
    solventCpm: () => simulation.sample.solvent?.cpm,
  });
}

export { computeDeltaS, scaleSoluteByExcitedFraction } from './math';
