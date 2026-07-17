/**
 * Client-side Debye simulation for the backendless (`static`) build.
 *
 * The static build ships no backend, so this runs entirely in the browser: it
 * resolves the structure file contents (uploaded molecules from the IndexedDB
 * store, falling back to the prerendered demo set via the read remote / Cache
 * API), parses the `.xyz`, computes I(Q) with the in-process kernel, and caches
 * the result in IndexedDB.
 *
 * Contents are resolved directly from the shared store + the demo remote (both
 * reachable from the simulation feature) rather than the molecule-feature
 * facade, which a cross-feature value import would forbid.
 *
 * The cache mirrors `dbSimulationSource.getDebyeResult`'s shape (keyed by
 * `moleculeId, qMin, qMax, qStep`). Unlike the DB path there is no gRPC
 * fallback — there is no backend to fall back to — so a parse/kernel failure
 * propagates to the caller (surfaced by the dashboard) rather than being
 * swallowed.
 */
import { get, set } from 'idb-keyval';

import { getMoleculeFileContent } from '$lib/molecule/molecule.remote';
import type { DebyeResult, SimRequest } from '$lib/shared/contracts';
import { getStoredMoleculeContent } from '$lib/shared/molecule-store';

import { computeDebyeIq } from './kernel/debye';
import { parseXyz } from './kernel/xyz-parser';

/**
 * IndexedDB key for a cached result, keyed by the same four fields the DB cache
 * uses: molecule id and the q-range (min, max, step).
 */
function cacheKey(request: SimRequest): string {
  const { fileId, qRange } = request;
  return `sim:${fileId}:${qRange.min}:${qRange.max}:${qRange.step}`;
}

/**
 * Compute Debye I(Q) entirely in the browser with the TS kernel — the single
 * compute path for every storage mode (the server no longer computes; see
 * bd-5 / `db-source`). Resolves the structure file contents (uploaded molecules
 * from IndexedDB, else the read remote) then parses + evaluates the kernel. A
 * parse/kernel failure propagates to the caller (surfaced by the dashboard).
 */
export async function computeDebyeClient(
  request: SimRequest,
): Promise<DebyeResult> {
  const contents =
    (await getStoredMoleculeContent(request.fileId)) ??
    (await getMoleculeFileContent(request.fileId)).contents;
  const { elements, xyz } = parseXyz(contents);
  return computeDebyeIq(elements, xyz, request.qRange);
}

/** IndexedDB cache read → client compute on miss → IndexedDB write-back. */
export async function getDebyeResultLocal(
  request: SimRequest,
): Promise<DebyeResult> {
  const key = cacheKey(request);

  const cached = await get<DebyeResult>(key);
  if (cached) return cached;

  const result = await computeDebyeClient(request);

  // Best-effort cache write: a storage failure (quota, private-mode
  // restrictions) must not fail an otherwise-good computation.
  try {
    await set(key, result);
  } catch (err) {
    console.error('Failed to cache Debye result:', err);
  }

  return result;
}
