/**
 * Remote functions for solvent data
 * (https://svelte.dev/docs/kit/remote-functions#prerender).
 *
 * Replaces GET /api/solvents (list + ?id= detail) for the dashboard,
 * experiment/samples, and the scattering fetcher.
 *
 * `prerender` (not `query`) is used because solvents are seed-only data —
 * nothing in this app creates/updates/deletes a solvent at runtime, so it
 * changes at most once per redeployment, which is exactly what `prerender`
 * is for (see initial-dev-4dy's research notes). It also has to be
 * `prerender`, not `query`: `query` cannot be called at all on a page that's
 * fully prerendered (`export const prerender = true`, as every route is on
 * the static demo build when `PUBLIC_PRERENDER_ALL=true`) — SvelteKit
 * throws at request time. `prerender` has no such restriction and, when a
 * value wasn't baked in ahead of time, transparently falls back to running
 * live on any target that has a server (confirmed by reading
 * node_modules/@sveltejs/kit/src/runtime/app/server/remote/prerender.js:
 * the server-side wrapper always executes `fn` when no matching prerendered
 * response is found).
 *
 * `getSolventIQ` sets `dynamic: true` and, on the static target only,
 * enumerates every known solvent id via `inputs` — `inputs` bakes a static
 * response for each id (so the static demo's interactive solvent
 * switching, currently broken/degraded, works with no server at all),
 * while `dynamic: true` guarantees the node target's live server can still
 * resolve *any* id (not just the ones that happened to exist at build
 * time) instead of only ever serving whatever was baked in at the last
 * deploy.
 *
 * `inputs` is gated behind `PUBLIC_TARGET === 'static'` rather than always
 * supplied: SvelteKit's build-time prerender step (see
 * node_modules/@sveltejs/kit/src/core/postbuild/prerender.js:530-591) scans
 * for *every* `prerender`-typed remote function in the app and awaits its
 * `inputs()` unconditionally, on *every* target — not just when
 * `PUBLIC_PRERENDER_ALL` is set. On the node target, `config_node`'s
 * `prerender.entries` (svelte.config.js) is a small, fast, non-DB-dependent
 * list (/, /docs, /experiment/detector, /experiment/pump-probe); kit's
 * internal task queue (postbuild/queue.js) can finish and close *while*
 * an async, DB-backed `inputs()` is still in flight, and the subsequent
 * `enqueue()` call throws "Cannot add tasks to a queue that has ended" —
 * a race in kit itself, reproduced and root-caused while building this
 * spike (initial-dev-a69 notes). The node target doesn't need `inputs`
 * anyway (it always has a live server, so `dynamic: true` alone is
 * sufficient there); only the static target — which has no server at
 * runtime — needs ids pre-baked at build time.
 */
import { PUBLIC_TARGET } from '$app/env/public';
import { prerender } from '$app/server';

import { solventSource } from '$lib/server/data';
import { solventIdSchema } from '$lib/shared/api/validation';

const STATIC = PUBLIC_TARGET === 'static';

export const listSolvents = prerender(async () => {
  return await solventSource.listSolvents();
});

// The underlying data source (db-source.ts / static-source.ts) already
// throws a proper `error(404, 'Solvent not found')` for an unknown id, so
// it propagates as-is — no extra try/catch needed here.
export const getSolventIQ = prerender(
  solventIdSchema,
  async (id) => {
    return await solventSource.getSolventIQ(id);
  },
  {
    dynamic: true,
    inputs: STATIC
      ? async () => {
          const solvents = await solventSource.listSolvents();
          return solvents.map((solvent) => solvent.id);
        }
      : undefined,
  },
);
