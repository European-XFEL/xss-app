/**
 * Client-facing facade for the Debye simulation, build-time switched on
 * `PUBLIC_TARGET`.
 *
 * - `node` / `static`: delegate to the `getDebyeResult` remote function, which
 *   runs on the server (gRPC/DB path) — the existing behavior.
 * - `local`: compute entirely in the browser (kernel + IndexedDB cache), since
 *   a serverless `adapter-static` deploy cannot invoke a `query` remote
 *   function at runtime.
 *
 * `PUBLIC_TARGET` is inlined at build time (see `src/env.ts`), so the unused
 * branch — and its imports — are dead-code-eliminated per target.
 */
import { PUBLIC_TARGET } from '$app/env/public';

import type { DebyeResult, SimRequest } from '$lib/shared/contracts';

import { getDebyeResultLocal } from './simulation-local';
import { getDebyeResult as getDebyeResultRemote } from './simulation.remote';

const LOCAL = PUBLIC_TARGET === 'local';

export function getDebyeResult(request: SimRequest): Promise<DebyeResult> {
  return LOCAL ? getDebyeResultLocal(request) : getDebyeResultRemote(request);
}
