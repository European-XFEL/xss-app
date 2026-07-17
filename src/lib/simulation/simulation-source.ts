/**
 * Client-facing facade for the Debye simulation, build-time switched on
 * `PUBLIC_TARGET`.
 *
 * - `static` (backendless): compute entirely in the browser (kernel + IndexedDB
 *   cache), since a serverless `adapter-static` deploy cannot invoke a `query`
 *   remote function at runtime.
 * - `node`: delegate to the `getDebyeResult` remote function, which runs on the
 *   server (gRPC/DB path). (bd-5 moves node compute client-side too.)
 *
 * `PUBLIC_TARGET` is inlined at build time (see `src/env.ts`), so the unused
 * branch — and its imports — are dead-code-eliminated per target.
 */
import { PUBLIC_TARGET } from '$app/env/public';

import type { DebyeResult, SimRequest } from '$lib/shared/contracts';

import { getDebyeResultLocal } from './simulation-local';
import { getDebyeResult as getDebyeResultRemote } from './simulation.remote';

const STATIC = PUBLIC_TARGET === 'static';

export function getDebyeResult(request: SimRequest): Promise<DebyeResult> {
  return STATIC ? getDebyeResultLocal(request) : getDebyeResultRemote(request);
}
