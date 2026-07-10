/**
 * URL search-param encoding for the simulation setup (solvent/molecule ids,
 * concentration, pump/probe/detector numeric fields, q-range).
 *
 * Kept as a plain module (no runes) so it can be imported from both a
 * `+layout.server.ts` load (id → object resolution happens there, against
 * the DB/static data source) and client components (serializing the live
 * `SimulationState` back into search params for `replaceState`).
 *
 * Individual, human-readable params rather than one opaque blob — each
 * field is independent, so a URL missing/mangling one param degrades
 * gracefully instead of invalidating the whole setup. `PARAM.version`
 * gates the whole scheme: a URL from a future, unrecognized version is
 * treated as if none of the other params were present (falls back to
 * defaults) rather than risking a misparse of a shape this code doesn't
 * know about.
 */
import type { SampleStateInit } from '$lib/sample';
import type { MoleculeInfo, SolventInfo } from '$lib/shared/contracts';
import { isValidQRange } from '$lib/simulation';

import type { SimulationStateInit } from './simulation-context.svelte';

export const SIMULATION_PARAMS_VERSION = '1';

export const PARAM = {
  version: 'v',
  solvent: 'solvent',
  ground: 'ground',
  excited: 'excited',
  concentration: 'conc',
  pumpPhotonEv: 'pumpE',
  pumpExcitedEv: 'pumpExE',
  pumpFraction: 'pumpFrac',
  wavelength: 'wavelength',
  detectorDistance: 'detDist',
  beamX: 'beamX',
  beamY: 'beamY',
  qMin: 'qMin',
  qMax: 'qMax',
  qStep: 'qStep',
} as const;

export interface ParsedSimulationParams {
  solventId: string | null;
  groundId: string | null;
  excitedId: string | null;
  concentrationSoluteMolar: number | null;
  pump: {
    photonEnergyEv: number | null;
    excitedStateEnergyEv: number | null;
    excitedStateFraction: number | null;
  };
  probe: {
    wavelength: number | null;
  };
  detector: {
    distance: number | null;
    beamCenter: { x: number; y: number } | null;
  };
  qRange: { min: number; max: number; step: number } | null;
}

function parseNum(raw: string | null): number | null {
  if (raw === null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** What `parseSimulationParams` returns for a URL whose params it can't/
 * shouldn't interpret (unrecognized `v`) — every field absent, so callers
 * fall back to defaults exactly as they would for a plain URL. */
const EMPTY_PARSED_SIMULATION_PARAMS: ParsedSimulationParams = {
  solventId: null,
  groundId: null,
  excitedId: null,
  concentrationSoluteMolar: null,
  pump: {
    photonEnergyEv: null,
    excitedStateEnergyEv: null,
    excitedStateFraction: null,
  },
  probe: { wavelength: null },
  detector: { distance: null, beamCenter: null },
  qRange: null,
};

/** Parse recognized simulation fields out of a URL's search params. Every
 * field is independently optional; unparseable/missing values come back as
 * `null` so callers can fall back to defaults without the whole setup
 * being discarded. */
export function parseSimulationParams(
  searchParams: URLSearchParams,
): ParsedSimulationParams {
  // A missing version param is a fresh/plain URL (e.g. no simulation setup
  // encoded yet) — nothing to gate. An explicit but unrecognized version is
  // a URL from a scheme this code doesn't understand, so ignore its params
  // wholesale rather than risk misinterpreting an incompatible shape.
  const version = searchParams.get(PARAM.version);
  if (version !== null && version !== SIMULATION_PARAMS_VERSION) {
    return EMPTY_PARSED_SIMULATION_PARAMS;
  }

  const beamX = parseNum(searchParams.get(PARAM.beamX));
  const beamY = parseNum(searchParams.get(PARAM.beamY));

  const qMin = parseNum(searchParams.get(PARAM.qMin));
  const qMax = parseNum(searchParams.get(PARAM.qMax));
  const qStep = parseNum(searchParams.get(PARAM.qStep));
  const qRangeCandidate =
    qMin !== null && qMax !== null && qStep !== null
      ? { min: qMin, max: qMax, step: qStep }
      : null;

  return {
    solventId: searchParams.get(PARAM.solvent),
    groundId: searchParams.get(PARAM.ground),
    excitedId: searchParams.get(PARAM.excited),
    concentrationSoluteMolar: parseNum(searchParams.get(PARAM.concentration)),
    pump: {
      photonEnergyEv: parseNum(searchParams.get(PARAM.pumpPhotonEv)),
      excitedStateEnergyEv: parseNum(searchParams.get(PARAM.pumpExcitedEv)),
      excitedStateFraction: parseNum(searchParams.get(PARAM.pumpFraction)),
    },
    probe: {
      wavelength: parseNum(searchParams.get(PARAM.wavelength)),
    },
    detector: {
      distance: parseNum(searchParams.get(PARAM.detectorDistance)),
      beamCenter:
        beamX !== null && beamY !== null ? { x: beamX, y: beamY } : null,
    },
    // Partial q-ranges are meaningless (and `isValidQRange` would reject
    // most of them anyway) — require all three or fall back to default.
    qRange:
      qRangeCandidate && isValidQRange(qRangeCandidate)
        ? qRangeCandidate
        : null,
  };
}

type NonNullFields<T> = { [K in keyof T]?: Exclude<T[K], null> };

/** Copy only the non-null entries of `source` into a fresh object, or
 * return `undefined` if none were set — the shape `SimulationStateInit`'s
 * nested fields need so an all-missing group is omitted entirely rather
 * than passed as `{}`. */
function definedOrUndefined<T extends Record<string, unknown>>(
  source: T,
): NonNullFields<T> | undefined {
  const out: NonNullFields<T> = {};
  for (const key of Object.keys(source) as (keyof T)[]) {
    const value = source[key];
    if (value !== null) out[key] = value as Exclude<T[keyof T], null>;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function buildSampleInit(
  parsed: ParsedSimulationParams,
  resolved: {
    ground: MoleculeInfo | null;
    excited: MoleculeInfo | null;
    solvent: SolventInfo | null;
  },
): SampleStateInit | undefined {
  return definedOrUndefined({
    solvent: resolved.solvent,
    ground: resolved.ground,
    excited: resolved.excited,
    concentrationSoluteMolar: parsed.concentrationSoluteMolar,
  });
}

/** Turn parsed URL params + the ids they reference (already resolved
 * against the molecule/solvent lists) into a `SimulationStateInit`, the
 * shape `SimulationState`'s constructor merges over its hardcoded
 * defaults. Fields that weren't present/resolvable in the URL are left
 * out entirely (not set to `null`) so the constructor's defaults win —
 * this is what makes an unknown/missing id or param a no-op fallback
 * rather than a crash or a forced-null override. */
export function buildSimulationStateInit(
  parsed: ParsedSimulationParams,
  resolved: {
    ground: MoleculeInfo | null;
    excited: MoleculeInfo | null;
    solvent: SolventInfo | null;
  },
): SimulationStateInit {
  return {
    sample: buildSampleInit(parsed, resolved),
    pump: definedOrUndefined(parsed.pump),
    probe: definedOrUndefined(parsed.probe),
    detector: definedOrUndefined(parsed.detector),
    qRange: parsed.qRange ?? undefined,
  };
}

export interface SerializableSimulationState {
  sample: {
    solvent: { id: string } | null;
    ground: { id: string } | null;
    excited: { id: string } | null;
    concentrationSoluteMolar: number | null;
  };
  pump: {
    photonEnergyEv: number;
    excitedStateEnergyEv: number;
    excitedStateFraction: number;
  };
  probe: { wavelength: number };
  detector: { distance: number; beamCenter: { x: number; y: number } };
  qRange: { min: number; max: number; step: number };
}

/** Serialize the live simulation state back into search params, for
 * `replaceState` to write after every edit. Only emits a param when the
 * corresponding value is set, keeping the URL as short as practical. */
export function serializeSimulationParams(
  state: SerializableSimulationState,
): URLSearchParams {
  const params = new URLSearchParams();

  params.set(PARAM.version, SIMULATION_PARAMS_VERSION);

  if (state.sample.solvent) params.set(PARAM.solvent, state.sample.solvent.id);
  if (state.sample.ground) params.set(PARAM.ground, state.sample.ground.id);
  if (state.sample.excited) params.set(PARAM.excited, state.sample.excited.id);
  if (state.sample.concentrationSoluteMolar !== null) {
    params.set(
      PARAM.concentration,
      String(state.sample.concentrationSoluteMolar),
    );
  }

  params.set(PARAM.pumpPhotonEv, String(state.pump.photonEnergyEv));
  params.set(PARAM.pumpExcitedEv, String(state.pump.excitedStateEnergyEv));
  params.set(PARAM.pumpFraction, String(state.pump.excitedStateFraction));

  params.set(PARAM.wavelength, String(state.probe.wavelength));

  params.set(PARAM.detectorDistance, String(state.detector.distance));
  params.set(PARAM.beamX, String(state.detector.beamCenter.x));
  params.set(PARAM.beamY, String(state.detector.beamCenter.y));

  params.set(PARAM.qMin, String(state.qRange.min));
  params.set(PARAM.qMax, String(state.qRange.max));
  params.set(PARAM.qStep, String(state.qRange.step));

  return params;
}
