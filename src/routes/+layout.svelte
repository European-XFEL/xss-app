<script lang="ts">
  import '$css';
  import { useDebounce } from 'runed';

  import { untrack } from 'svelte';

  import { replaceState } from '$app/navigation';
  import { asset, resolve } from '$app/paths';
  import { page } from '$app/state';

  import * as Sidebar from '$shadcn/ui/sidebar/index.js';

  import {
    createSimulationState,
    setSimulationState,
  } from '$lib/app/simulation-context.svelte';
  import { serializeSimulationParams } from '$lib/app/simulation-url';

  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();

  // Seeded from `+layout.server.ts`, which resolves any simulation setup
  // encoded in the URL — SSR and the first client render agree by
  // construction, so a hard reload or a shared link restores the setup
  // instead of hydrating into "SETUP INCOMPLETE" (initial-dev-2ae). Only
  // the *initial* `data.simulationSetup` is used to seed state — once
  // created, `simulation` is the single source of truth and edits flow
  // out to the URL (below), not back in from a re-run `load`.
  const simulation = createSimulationState(untrack(() => data.simulationSetup));
  setSimulationState(simulation);

  // Mirror edits back into the URL, debounced so dragging a slider or
  // typing doesn't spam browser history. `replaceState` only swaps the
  // current history entry's URL/state — it never navigates or triggers a
  // `load` rerun — so this can't create a write/read feedback loop with
  // the load function above.
  //
  // Only the write (`replaceState` below) is debounced — `params` is built
  // synchronously inside the `$effect` on every run, since `$effect` only
  // tracks state read *synchronously* during its own execution: reading
  // `simulation.pump` etc. here (including indirectly, via
  // `serializeSimulationParams`) is what makes per-field edits re-trigger
  // this effect. Reading them later, inside the debounced callback, would
  // not.
  const syncUrl = useDebounce((params: URLSearchParams) => {
    // Stay on the current route and just rewrite the search string.
    // `page.route.id` is only null for the (rare) case there's no matched
    // route, e.g. a 404 — nothing to sync the URL for there.
    const routeId = page.route.id;
    if (!routeId) return;

    const target = resolve(`${routeId}?${params.toString()}`);
    // `page.state` is passed through (not omitted) so this rewrite
    // preserves any shallow-routing state already attached to the current
    // history entry — omitting it would silently drop that state on every
    // debounced sync.
    replaceState(target, page.state);
  }, 400);

  $effect(() => {
    const params = serializeSimulationParams({
      sample: {
        solvent: simulation.sample.solvent,
        ground: simulation.sample.ground,
        excited: simulation.sample.excited,
        concentrationSoluteMolar: simulation.sample.concentrationSoluteMolar,
      },
      pump: simulation.pump,
      probe: simulation.probe,
      detector: {
        distance: simulation.detector.distance,
        beamCenter: simulation.detector.beamCenter,
      },
      qRange: simulation.qRange,
    });

    // `untrack`: runed's `useDebounce` keeps its pending-call context in
    // `$state` and both reads and writes it on every invocation — calling
    // it tracked from inside this `$effect` makes the effect depend on
    // state it just mutated, which self-retriggers until Svelte aborts
    // with `effect_update_depth_exceeded`.
    untrack(() => void syncUrl(params));
  });
</script>

<svelte:head>
  <link rel="icon" href={asset('/favicon.png')} />
  {#await import('katex/dist/katex.min.css') then katexCss}
    {katexCss.default}
  {/await}
</svelte:head>

<Sidebar.Provider style="--sidebar-width: 190px">
  {@render children()}
</Sidebar.Provider>
