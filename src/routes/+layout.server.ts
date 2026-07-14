import { building } from '$app/env';

import {
  buildSimulationStateInit,
  parseSimulationParams,
} from '$lib/app/simulation-url';
import { moleculeSource, solventSource } from '$lib/server/data';

import type { LayoutServerLoad } from './$types';

/**
 * `url.searchParams` cannot be read while prerendering — SvelteKit throws
 * ("Cannot access url.searchParams on a page with prerendering enabled"),
 * since a prerendered page has no real per-request query string to key
 * off of. `building` (from `$app/env`) is true for the whole build step,
 * including prerendering, and false whenever `load` runs against a live
 * request (node target at runtime, or dev), so it gates the fallback to
 * an empty `URLSearchParams` here instead of touching the real one. This
 * only affects prerendered output (which can't vary by query string
 * anyway); real requests — including a shared link hitting the node
 * server — still resolve `url.searchParams` normally. Split out from
 * `load` so the branch doesn't add to its complexity budget.
 */
function effectiveSearchParams(url: URL): URLSearchParams {
  return building ? new URLSearchParams() : url.searchParams;
}

/**
 * Resolve the simulation setup encoded in URL search params (see
 * `simulation-url.ts`) so SSR and the first client render start from the
 * same state — a hard reload or a shared link fully restores the setup
 * instead of resetting to "SETUP INCOMPLETE" (initial-dev-2ae).
 *
 * Unknown/stale molecule or solvent ids (e.g. a link shared before an id
 * was removed) resolve to `null` here and `SimulationState` falls back to
 * its defaults for that field — no crash, no all-or-nothing rejection of
 * the rest of the setup.
 */
export const load: LayoutServerLoad = async ({ locals, url }) => {
  const parsed = parseSimulationParams(effectiveSearchParams(url));

  const needsMolecules = parsed.groundId !== null || parsed.excitedId !== null;
  const needsSolvent = parsed.solventId !== null;

  const [molecules, solvents] = await Promise.all([
    needsMolecules ? moleculeSource.listMolecules() : Promise.resolve([]),
    needsSolvent ? solventSource.listSolvents() : Promise.resolve([]),
  ]);

  const ground = parsed.groundId
    ? (molecules.find((m) => m.id === parsed.groundId) ?? null)
    : null;
  const excited = parsed.excitedId
    ? (molecules.find((m) => m.id === parsed.excitedId) ?? null)
    : null;
  const solvent = parsed.solventId
    ? (solvents.find((s) => s.id === parsed.solventId) ?? null)
    : null;

  return {
    capabilities: locals.capabilities,
    simulationSetup: buildSimulationStateInit(parsed, {
      ground,
      excited,
      solvent,
    }),
  };
};
