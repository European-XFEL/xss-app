/**
 * Client-side Debye simulation for the local-only build (`PUBLIC_TARGET=local`).
 *
 * The local build ships no backend, so this runs entirely in the browser: it
 * resolves the structure file contents (from the prerendered demo molecules via
 * the molecule read remote, served from the browser Cache API), parses the
 * `.xyz`, computes I(Q) with the in-process kernel, and caches the result in
 * IndexedDB.
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

export async function getDebyeResultLocal(
  request: SimRequest,
): Promise<DebyeResult> {
  const key = cacheKey(request);

  const cached = await get<DebyeResult>(key);
  if (cached) return cached;

  const { contents } = await getMoleculeFileContent(request.fileId);
  const { elements, xyz } = parseXyz(contents);
  const result = computeDebyeIq(elements, xyz, request.qRange);

  // Best-effort cache write, mirroring the DB path: a storage failure (quota,
  // private-mode restrictions) must not fail an otherwise-good computation.
  try {
    await set(key, result);
  } catch (err) {
    console.error('Failed to cache Debye result:', err);
  }

  return result;
}
