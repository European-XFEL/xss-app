import { getContext, hasContext, setContext } from 'svelte';

import { DetectorState } from '$lib/detector';
import { SampleState, type SampleStateInit } from '$lib/sample';

export const DEFAULT = {
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
  detector: {
    distance: 100,
  },
};

const APP_STATE_KEY = Symbol('simulation-state');

export interface SimulationStateInit {
  qRange?: { min: number; max: number; step: number };
  pump?: {
    photonEnergyEv?: number;
    excitedStateEnergyEv?: number;
    excitedStateFraction?: number;
  };
  probe?: { wavelength?: number };
  detector?: { distance?: number; beamCenter?: { x: number; y: number } };
  sample?: SampleStateInit;
}

/** Overlay only the defined keys of `init` onto `target`, in place — a
 * plain `Object.assign` would clobber a default with an explicit
 * `undefined` for any key the caller didn't actually set. */
function applyDefined<T extends object>(
  target: T,
  init: Partial<T> | undefined,
): void {
  if (!init) return;
  for (const key of Object.keys(init) as (keyof T)[]) {
    const value = init[key];
    if (value !== undefined) target[key] = value;
  }
}

export class SimulationState {
  qRange = $state(structuredClone(DEFAULT.qRange));
  pump = $state(structuredClone(DEFAULT.pump));
  probe = $state(structuredClone(DEFAULT.probe));

  detector: DetectorState;
  sample: SampleState;

  // Set by whichever view owns the scattering fetch resources (currently
  // the dashboard page) so the shared app shell can reflect a real
  // "recomputing…" state instead of only inferring it from sample
  // completeness.
  computing = $state(false);

  constructor(init?: SimulationStateInit) {
    if (init?.qRange) this.qRange = structuredClone(init.qRange);
    applyDefined(this.pump, init?.pump);
    applyDefined(this.probe, init?.probe);

    this.detector = new DetectorState('LPD', this.probe.wavelength, {
      distance: init?.detector?.distance,
      beamCenter: init?.detector?.beamCenter,
    });
    this.sample = new SampleState(init?.sample);

    $effect(() => {
      this.detector.wavelength = this.probe.wavelength;
    });
  }
}

export function createSimulationState(
  init?: SimulationStateInit,
): SimulationState {
  return new SimulationState(init);
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
