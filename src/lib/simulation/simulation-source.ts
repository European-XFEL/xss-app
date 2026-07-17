/**
 * Client-facing facade for the Debye simulation. Compute is ALWAYS client-side
 * (the TS kernel); only the CACHE differs by storage mode:
 *
 * - static build, or node with the backendless-storage toggle → IndexedDB
 *   read/write (`getDebyeResultLocal`).
 * - node with Postgres storage → read the shared cache (server query), compute
 *   client-side on a miss, then write back to the shared cache (server command),
 *   skipping that write in client-only mode (nothing is written to Postgres).
 *
 * `STATIC` is a build-time constant (inlined `PUBLIC_TARGET`), so its guard
 * const-folds and the server-cache branch — and the `simulation.remote` import
 * — tree-shakes out of the static bundle. Mirrors the molecule facade shape.
 */
import { PUBLIC_TARGET } from '$app/env/public';

import type { DebyeResult, SimRequest } from '$lib/shared/contracts';
import { useClientStorage } from '$lib/shared/storage-mode';

import { computeDebyeClient, getDebyeResultLocal } from './simulation-local';
import { cacheDebyeResult, getCachedDebyeResult } from './simulation.remote';

const STATIC = PUBLIC_TARGET === 'static';

/** node-Postgres: shared cache read → client compute on miss → write-back. */
async function getDebyeResultServer(request: SimRequest): Promise<DebyeResult> {
  const cached = await getCachedDebyeResult(request);
  if (cached) return cached;

  const result = await computeDebyeClient(request);

  // Best-effort shared-cache write; a caching failure must not fail the result.
  try {
    await cacheDebyeResult({ request, result });
  } catch (err) {
    console.error('Failed to cache Debye result:', err);
  }

  return result;
}

export function getDebyeResult(request: SimRequest): Promise<DebyeResult> {
  if (STATIC) return getDebyeResultLocal(request);
  return useClientStorage()
    ? getDebyeResultLocal(request)
    : getDebyeResultServer(request);
}
