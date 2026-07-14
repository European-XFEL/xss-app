/**
 * URL search-param encoding for the simulation setup (solvent/molecule ids,
 * concentration, pump/probe/detector numeric fields, q-range).
 *
 * Kept as a plain module (no runes) so it can be imported from both a
 * `+layout.server.ts` load (id → object resolution happens there, against
 * the DB/static data source) and client components (serializing the live
 * `SimulationState` into a shareable URL via `serializeSimulationParams`).
 *
 * Everything is packed into a single opaque `s` param — a version tag
 * followed by every field, in a fixed order, joined with `|` and
 * base64url-encoded — rather than one param per field. Ids are 24-char
 * cuid2 (alphanumeric only) and every numeric field is serialized with
 * plain `String(number)`, so none of them can ever contain the `|`
 * separator; that's what makes positional (rather than key=value) packing
 * safe here. The leading version segment gates the whole scheme: a link
 * from a future, unrecognized version — or one that's simply malformed
 * (bad base64, wrong segment count) — is treated as if no simulation setup
 * were encoded at all (falls back to defaults) rather than risking a
 * misparse of a shape/encoding this code doesn't know about.
 */
import type { SampleStateInit } from '$lib/sample';
import type { MoleculeInfo, SolventInfo } from '$lib/shared/contracts';
import { isValidQRange } from '$lib/simulation';

import type { SimulationStateInit } from './simulation-context.svelte';

export const SIMULATION_PARAMS_VERSION = '1';

/** The single query param a shared link is encoded into. */
export const SHARE_PARAM = 's';

/** Number of `|`-joined segments in a valid `SHARE_PARAM` payload: the
 * version tag plus every field below, in order. */
const SEGMENT_COUNT = 15;

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

function parseNum(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** What `parseSimulationParams` returns for a URL whose params it can't/
 * shouldn't interpret (unrecognized version, malformed payload) — every
 * field absent, so callers fall back to defaults exactly as they would for
 * a plain URL. */
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

/** Encode an ASCII string as unpadded base64url. Every SHARE_PARAM
 * segment is ASCII (cuid2 ids + String(number)) joined with `|`, so plain
 * `btoa` suffices — no UTF-8 byte handling is needed. */
function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Inverse of `toBase64Url`. Throws (`atob` rejects non-base64 input) on a
 * malformed payload — callers must catch. */
function fromBase64Url(input: string): string {
  const padded =
    input.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (input.length % 4)) % 4);
  return atob(padded);
}

/** Decode + validate a `SHARE_PARAM` value down to its raw `|`-joined
 * segments, or `null` for any failure mode — invalid base64, wrong segment
 * count, unrecognized version. Split out from `decodeSimulationPayload` so
 * neither function trips the lint complexity/length limits. */
function splitSharePayload(encoded: string): string[] | null {
  let decoded: string;
  try {
    decoded = fromBase64Url(encoded);
  } catch {
    return null;
  }

  const segments = decoded.split('|');
  if (segments.length !== SEGMENT_COUNT) return null;
  if (segments[0] !== SIMULATION_PARAMS_VERSION) return null;
  return segments;
}

function parseBeamCenter(
  x: string | null,
  y: string | null,
): { x: number; y: number } | null {
  const xNum = parseNum(x);
  const yNum = parseNum(y);
  return xNum !== null && yNum !== null ? { x: xNum, y: yNum } : null;
}

/** Partial q-ranges are meaningless (and `isValidQRange` would reject most
 * of them anyway) — require all three fields or fall back to `null`. */
function parseQRange(
  min: string | null,
  max: string | null,
  step: string | null,
): { min: number; max: number; step: number } | null {
  const minNum = parseNum(min);
  const maxNum = parseNum(max);
  const stepNum = parseNum(step);
  if (minNum === null || maxNum === null || stepNum === null) return null;

  const candidate = { min: minNum, max: maxNum, step: stepNum };
  return isValidQRange(candidate) ? candidate : null;
}

/** Turn already-validated `SHARE_PARAM` segments into `ParsedSimulationParams`.
 * Segment order must match `serializeSimulationParams`'s `segments` array
 * exactly — the round-trip test in `simulation-url.test.ts` is what guards
 * against that drifting. */
function parseSegments(segments: string[]): ParsedSimulationParams {
  const [
    ,
    solventId,
    groundId,
    excitedId,
    concentration,
    pumpPhotonEv,
    pumpExcitedEv,
    pumpFraction,
    wavelength,
    detectorDistance,
    beamX,
    beamY,
    qMin,
    qMax,
    qStep,
  ] = segments;

  return {
    solventId: solventId || null,
    groundId: groundId || null,
    excitedId: excitedId || null,
    concentrationSoluteMolar: parseNum(concentration),
    pump: {
      photonEnergyEv: parseNum(pumpPhotonEv),
      excitedStateEnergyEv: parseNum(pumpExcitedEv),
      excitedStateFraction: parseNum(pumpFraction),
    },
    probe: {
      wavelength: parseNum(wavelength),
    },
    detector: {
      distance: parseNum(detectorDistance),
      beamCenter: parseBeamCenter(beamX, beamY),
    },
    qRange: parseQRange(qMin, qMax, qStep),
  };
}

/** Decode a `SHARE_PARAM` value into `ParsedSimulationParams`. Any failure
 * mode — invalid base64, wrong segment count, unrecognized version — comes
 * back as `EMPTY_PARSED_SIMULATION_PARAMS`, never a thrown error, since this
 * runs in `+layout.server.ts`'s load path where an uncaught exception would
 * 500 the page for what's just a bad/stale link. */
function decodeSimulationPayload(encoded: string): ParsedSimulationParams {
  const segments = splitSharePayload(encoded);
  return segments ? parseSegments(segments) : EMPTY_PARSED_SIMULATION_PARAMS;
}

/** Whether a URL carries an encoded simulation setup — used to decide
 * whether a restore happened and the URL should be cleaned back to the
 * plain path. */
export function hasEncodedSimulationParams(
  searchParams: URLSearchParams,
): boolean {
  return searchParams.has(SHARE_PARAM);
}

/** Parse recognized simulation fields out of a URL's search params. Every
 * field is independently optional; unparseable/missing values come back as
 * `null` so callers can fall back to defaults without the whole setup being
 * discarded. */
export function parseSimulationParams(
  searchParams: URLSearchParams,
): ParsedSimulationParams {
  const encoded = searchParams.get(SHARE_PARAM);
  return encoded !== null
    ? decodeSimulationPayload(encoded)
    : EMPTY_PARSED_SIMULATION_PARAMS;
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

/** Serialize the live simulation state into a single-param `URLSearchParams`
 * (`SHARE_PARAM` only) for the Share button to copy into a link. Field
 * order matches `decodeSimulationPayload`'s destructure exactly — changing
 * one without the other is a silent drift, which is what the round-trip
 * test in `simulation-url.test.ts` guards against. */
export function serializeSimulationParams(
  state: SerializableSimulationState,
): URLSearchParams {
  const segments = [
    SIMULATION_PARAMS_VERSION,
    state.sample.solvent?.id ?? '',
    state.sample.ground?.id ?? '',
    state.sample.excited?.id ?? '',
    state.sample.concentrationSoluteMolar !== null
      ? String(state.sample.concentrationSoluteMolar)
      : '',
    String(state.pump.photonEnergyEv),
    String(state.pump.excitedStateEnergyEv),
    String(state.pump.excitedStateFraction),
    String(state.probe.wavelength),
    String(state.detector.distance),
    String(state.detector.beamCenter.x),
    String(state.detector.beamCenter.y),
    String(state.qRange.min),
    String(state.qRange.max),
    String(state.qRange.step),
  ];

  return new URLSearchParams({
    [SHARE_PARAM]: toBase64Url(segments.join('|')),
  });
}
