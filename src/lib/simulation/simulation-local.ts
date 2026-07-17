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

import { browser } from '$app/environment';

import { getMoleculeFileContent } from '$lib/molecule/molecule.remote';
import type { DebyeResult, SimRequest } from '$lib/shared/contracts';
import { getStoredMoleculeContent } from '$lib/shared/molecule-store';

import type { DebyeWorkerRequest, DebyeWorkerResponse } from './debye.worker';
import { computeDebyeIq } from './kernel/debye';
import { parseXyz } from './kernel/xyz-parser';

// ─── Web Worker dispatch ──────────────────────────────────────────────────────
// The O(N²·|Q|) kernel runs in a worker so large structures don't jank the UI
// thread (bd-8). One worker is shared across calls; requests are correlated by
// an incrementing id. Constructed lazily and only in the browser — SSR / the
// node build must never `new Worker(...)` (guarded by `browser` below).

let worker: Worker | undefined;
let seq = 0;
const pending = new Map<
  number,
  { resolve: (r: DebyeResult) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./debye.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = ({ data }: MessageEvent<DebyeWorkerResponse>) => {
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      if (data.ok) p.resolve(data.result);
      else p.reject(new Error(data.error));
    };
    // A worker-level crash rejects everything in flight rather than hanging.
    worker.onerror = (event) => {
      const err = new Error(event.message || 'Debye worker error');
      for (const p of pending.values()) p.reject(err);
      pending.clear();
      worker = undefined;
    };
  }
  return worker;
}

function computeInWorker(
  elements: string[],
  xyz: [number, number, number][],
  qRange: SimRequest['qRange'],
): Promise<DebyeResult> {
  const id = (seq += 1);
  // Plain copies: callers hand us reactive ($state) arrays/objects, and
  // postMessage's structured clone rejects proxies (DataCloneError).
  const message: DebyeWorkerRequest = {
    id,
    elements: Array.from(elements),
    xyz: xyz.map(([x, y, z]) => [x, y, z]),
    qRange: { min: qRange.min, max: qRange.max, step: qRange.step },
  };
  return new Promise<DebyeResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage(message);
  });
}

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
  // Browser: offload the kernel to the worker. SSR / node build (no `Worker`):
  // fall back to a synchronous in-process compute so the module stays isomorphic.
  return browser
    ? computeInWorker(elements, xyz, request.qRange)
    : computeDebyeIq(elements, xyz, request.qRange);
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
