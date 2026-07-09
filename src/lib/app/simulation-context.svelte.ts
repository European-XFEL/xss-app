import { getContext, hasContext, setContext } from 'svelte';

import { DetectorState } from '$lib/detector';
import { SampleState } from '$lib/sample';

const DEFAULT = {
  qRange: {
    min: 0.005253,
    max: 8.498164,
    step: 0.006044,
  },
  pump: {
    photonEnergyEv: 4.0,
    excitedStateEnergyEv: 2.0,
    excitedStateFraction: 0.5,
  },
  probe: {
    wavelength: 1.54,
  },
};

const APP_STATE_KEY = Symbol('simulation-state');

export class SimulationState {
  qRange = $state(structuredClone(DEFAULT.qRange));
  pump = $state(structuredClone(DEFAULT.pump));
  probe = $state(structuredClone(DEFAULT.probe));

  detector = new DetectorState('LPD', DEFAULT.probe.wavelength);
  sample = new SampleState();

  // Set by whichever view owns the scattering fetch resources (currently
  // the dashboard page) so the shared app shell can reflect a real
  // "recomputing…" state instead of only inferring it from sample
  // completeness.
  computing = $state(false);

  constructor() {
    $effect(() => {
      this.detector.wavelength = this.probe.wavelength;
    });
  }
}

export function createSimulationState(): SimulationState {
  return new SimulationState();
}

export function setSimulationState(state: SimulationState): void {
  setContext<SimulationState>(APP_STATE_KEY, state);
}

export function useSimulationState(): SimulationState {
  if (!hasContext(APP_STATE_KEY)) {
    throw new Error(
      'Simulation state has not been provided in this component tree.',
    );
  }

  return getContext<SimulationState>(APP_STATE_KEY);
}
