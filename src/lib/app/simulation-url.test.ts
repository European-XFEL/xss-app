import { describe, expect, it } from 'vitest';

import type { MoleculeInfo, SolventInfo } from '$lib/shared/contracts';

import type { SimulationStateInit } from './simulation-context.svelte';
import {
  type ParsedSimulationParams,
  SHARE_PARAM,
  type SerializableSimulationState,
  buildSimulationStateInit,
  hasEncodedSimulationParams,
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
  readOnly: false,
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
  readOnly: false,
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
    concentrationSoluteMmol: 23.4,
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

/** The `|`-joined segments `serializeSimulationParams` should produce for
 * `fixture`, in the exact order `parseSegments` (in `simulation-url.ts`)
 * destructures them — reused by both the "serializes" and
 * "unrecognized version" tests below. */
const FIXTURE_SEGMENTS = [
  '2',
  solvent.id,
  ground.id,
  excited.id,
  '23.4',
  '4.75',
  '2.25',
  '0.63',
  '1.789',
  '123.4',
  '321.5',
  '654.25',
  '0.0111',
  '7.234',
  '0.0123',
];

/** What `parseSimulationParams` should return for `fixture`. */
const EXPECTED_PARSED: ParsedSimulationParams = {
  solventId: solvent.id,
  groundId: ground.id,
  excitedId: excited.id,
  concentrationSoluteMmol: fixture.sample.concentrationSoluteMmol,
  pump: fixture.pump,
  probe: fixture.probe,
  detector: fixture.detector,
  qRange: fixture.qRange,
};

/** What `buildSimulationStateInit` should return for `fixture` once its ids
 * have been resolved against `resolved`. */
const EXPECTED_INIT: SimulationStateInit = {
  sample: {
    solvent,
    ground,
    excited,
    concentrationSoluteMmol: fixture.sample.concentrationSoluteMmol,
  },
  pump: fixture.pump,
  probe: fixture.probe,
  detector: fixture.detector,
  qRange: fixture.qRange,
};

/** Encode a raw `|`-joined payload the same way `serializeSimulationParams`
 * does, for tests that need to hand-construct a malformed `s` value
 * rather than go through the real encoder. Deliberately independent of
 * `simulation-url.ts`'s internal `toBase64Url` (not exported) so a bug in
 * that function can't hide a bug in this test. */
function encodeRaw(payload: string): string {
  return Buffer.from(payload, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

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
 *
 * Not wrapped in one umbrella `describe` — each block below is a
 * standalone top-level group so no single test function grows past the
 * lint's line-count limit.
 */
describe('full setup', () => {
  it('serializes every field into a single share param', () => {
    const params = serializeSimulationParams(fixture);

    expect([...params.keys()]).toEqual([SHARE_PARAM]);
    expect(params.get(SHARE_PARAM)).toBe(encodeRaw(FIXTURE_SEGMENTS.join('|')));
  });

  it('parses every serialized param back to its original value', () => {
    const params = serializeSimulationParams(fixture);
    expect(parseSimulationParams(params)).toEqual(EXPECTED_PARSED);
  });

  it('builds a SimulationStateInit that reproduces every original field', () => {
    const params = serializeSimulationParams(fixture);
    const parsed = parseSimulationParams(params);
    expect(buildSimulationStateInit(parsed, resolved)).toEqual(EXPECTED_INIT);
  });
});

describe('optional fields omitted', () => {
  it('round-trips with sample fields empty', () => {
    const noSample: SerializableSimulationState = {
      ...fixture,
      sample: {
        solvent: null,
        ground: null,
        excited: null,
        concentrationSoluteMmol: null,
      },
    };

    const params = serializeSimulationParams(noSample);
    const parsed = parseSimulationParams(params);

    expect(parsed.solventId).toBeNull();
    expect(parsed.groundId).toBeNull();
    expect(parsed.excitedId).toBeNull();
    expect(parsed.concentrationSoluteMmol).toBeNull();
    // Non-sample fields are unaffected.
    expect(parsed.pump).toEqual(fixture.pump);
  });
});

describe('unrecognized version', () => {
  it('falls back to defaults', () => {
    const badVersion = encodeRaw(
      ['999', ...FIXTURE_SEGMENTS.slice(1)].join('|'),
    );
    const params = new URLSearchParams({ [SHARE_PARAM]: badVersion });

    const parsed = parseSimulationParams(params);
    // With no ids parsed out (unrecognized version), a real caller
    // (`+layout.server.ts`) never resolves any ground/excited/solvent —
    // mirror that here instead of reusing the populated `resolved` fixture.
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

describe('malformed share param', () => {
  it('falls back to defaults for undecodable base64', () => {
    const params = new URLSearchParams({
      [SHARE_PARAM]: 'not-valid-base64!!!',
    });

    expect(parseSimulationParams(params)).toEqual({
      solventId: null,
      groundId: null,
      excitedId: null,
      concentrationSoluteMmol: null,
      pump: {
        photonEnergyEv: null,
        excitedStateEnergyEv: null,
        excitedStateFraction: null,
      },
      probe: { wavelength: null },
      detector: { distance: null, beamCenter: null },
      qRange: null,
    });
  });

  it('falls back to defaults for a truncated/wrong-arity payload', () => {
    const params = new URLSearchParams({
      [SHARE_PARAM]: encodeRaw('1|only|three|segments'),
    });

    expect(parseSimulationParams(params).qRange).toBeNull();
    expect(parseSimulationParams(params).solventId).toBeNull();
  });
});

describe('hasEncodedSimulationParams', () => {
  it('is false for a plain URL', () => {
    expect(hasEncodedSimulationParams(new URLSearchParams())).toBe(false);
  });

  it('is true when the share param is present', () => {
    const params = serializeSimulationParams(fixture);
    expect(hasEncodedSimulationParams(params)).toBe(true);
  });
});
