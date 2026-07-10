import { describe, expect, it } from 'vitest';

import type { MoleculeInfo, SolventInfo } from '$lib/shared/contracts';

import type { SimulationStateInit } from './simulation-context.svelte';
import {
  type ParsedSimulationParams,
  type SerializableSimulationState,
  buildSimulationStateInit,
  parseSimulationParams,
  serializeSimulationParams,
} from './simulation-url';

const solvent: SolventInfo = {
  id: 'solvent-1',
  name: 'Water',
  rhom: 55000,
  cpm: 75,
  filename: 'water.iq',
  sha: 'sha-solvent',
  createdAt: new Date('2024-01-01'),
  updatedAt: undefined,
  qMin: 0.01,
  qMax: 8,
  qStep: 0.01,
};

const ground: MoleculeInfo = {
  id: 'molecule-ground',
  filename: 'ground.pdb',
  sha: 'sha-ground',
  moleculeName: 'Ground state',
  description: 'ground state molecule',
  state: 0,
  reference: null,
  atomCount: 12,
  createdAt: new Date('2024-01-02'),
  updatedAt: undefined,
};

const excited: MoleculeInfo = {
  id: 'molecule-excited',
  filename: 'excited.pdb',
  sha: 'sha-excited',
  moleculeName: 'Excited state',
  description: 'excited state molecule',
  state: 1,
  reference: null,
  atomCount: 12,
  createdAt: new Date('2024-01-03'),
  updatedAt: undefined,
};

/**
 * Every `SerializableSimulationState` field set to a distinct, non-default
 * value. All fields on this interface are required (not optional), so
 * adding a new one forces this literal to be updated too — the first line
 * of defense against codec drift referenced below.
 */
const fixture: SerializableSimulationState = {
  sample: {
    solvent: { id: solvent.id },
    ground: { id: ground.id },
    excited: { id: excited.id },
    concentrationSoluteMolar: 0.0234,
  },
  pump: {
    photonEnergyEv: 4.75,
    excitedStateEnergyEv: 2.25,
    excitedStateFraction: 0.63,
  },
  probe: { wavelength: 1.789 },
  detector: { distance: 123.4, beamCenter: { x: 321.5, y: 654.25 } },
  qRange: { min: 0.0111, max: 7.234, step: 0.0123 },
};

const resolved = { ground, excited, solvent };

/**
 * Round-trips every `SimulationState` field through
 * serialize -> parse -> build. `ParsedSimulationParams` and
 * `SerializableSimulationState` are both fully required interfaces, so a
 * field added to either without wiring it through `parseSimulationParams`/
 * `serializeSimulationParams`/`buildSimulationStateInit` shows up here as a
 * type error on the fixture/expectation literals (codec shapes drifting
 * out of sync) or a failed assertion (codec wired but silently dropping a
 * value) — this test is the single place that exercises the full chain for
 * every field at once, rather than per-field elsewhere.
 */
describe('simulation-url round trip', () => {
  describe('full setup', () => {
    it('serializes every field into distinguishable search params', () => {
      const params = serializeSimulationParams(fixture);

      expect(Object.fromEntries(params)).toEqual({
        v: '1',
        solvent: solvent.id,
        ground: ground.id,
        excited: excited.id,
        conc: '0.0234',
        pumpE: '4.75',
        pumpExE: '2.25',
        pumpFrac: '0.63',
        wavelength: '1.789',
        detDist: '123.4',
        beamX: '321.5',
        beamY: '654.25',
        qMin: '0.0111',
        qMax: '7.234',
        qStep: '0.0123',
      });
    });

    it('parses every serialized param back to its original value', () => {
      const params = serializeSimulationParams(fixture);
      const parsed = parseSimulationParams(params);

      const expected: ParsedSimulationParams = {
        solventId: solvent.id,
        groundId: ground.id,
        excitedId: excited.id,
        concentrationSoluteMolar: fixture.sample.concentrationSoluteMolar,
        pump: fixture.pump,
        probe: fixture.probe,
        detector: fixture.detector,
        qRange: fixture.qRange,
      };

      expect(parsed).toEqual(expected);
    });

    it('builds a SimulationStateInit that reproduces every original field', () => {
      const params = serializeSimulationParams(fixture);
      const parsed = parseSimulationParams(params);
      const init = buildSimulationStateInit(parsed, resolved);

      const expected: SimulationStateInit = {
        sample: {
          solvent,
          ground,
          excited,
          concentrationSoluteMolar: fixture.sample.concentrationSoluteMolar,
        },
        pump: fixture.pump,
        probe: fixture.probe,
        detector: fixture.detector,
        qRange: fixture.qRange,
      };

      expect(init).toEqual(expected);
    });
  });

  describe('unrecognized version', () => {
    it('falls back to defaults', () => {
      const params = serializeSimulationParams(fixture);
      params.set('v', '999');

      const parsed = parseSimulationParams(params);
      // With no ids parsed out (unrecognized version), a real caller
      // (`+layout.server.ts`) never resolves any ground/excited/solvent —
      // mirror that here instead of reusing the populated `resolved`
      // fixture.
      const init = buildSimulationStateInit(parsed, {
        ground: null,
        excited: null,
        solvent: null,
      });

      expect(init).toEqual({
        sample: undefined,
        pump: undefined,
        probe: undefined,
        detector: undefined,
        qRange: undefined,
      });
    });
  });
});
