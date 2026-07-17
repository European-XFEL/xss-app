/**
 * Remote functions for the shared Postgres Debye cache (node build only).
 *
 * Debye I(Q) is computed client-side by the TS kernel (see `simulation-local`);
 * the server no longer computes. These two functions are just the shared cache:
 * - `getCachedDebyeResult` (query): read a cached result, or `null` on a miss.
 * - `cacheDebyeResult` (command): persist a client-computed result for everyone.
 *
 * The facade (`simulation-source`) only reaches these on node-Postgres storage;
 * on the static build (and node with the backendless-storage toggle) it uses
 * the IndexedDB path instead, so this module tree-shakes out of those bundles.
 */
import { command, query } from '$app/server';

import { simulationSource } from '$lib/server/data';
import {
  cacheDebyeResultSchema,
  simulationSchema,
} from '$lib/shared/api/validation';
import type { DebyeResult } from '$lib/shared/contracts';

export const getCachedDebyeResult = query(
  simulationSchema,
  async (request): Promise<DebyeResult | null> => {
    return simulationSource.getDebyeResult(request);
  },
);

export const cacheDebyeResult = command(
  cacheDebyeResultSchema,
  async ({ request, result }): Promise<void> => {
    await simulationSource.cacheDebyeResult(request, result);
  },
);
