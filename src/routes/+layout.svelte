<script lang="ts">
  import '$css';

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

    const timeout = setTimeout(() => {
      // Stay on the current route and just rewrite the search string.
      // `page.route.id` is only null for the (rare) case there's no
      // matched route, e.g. a 404 — nothing to sync the URL for there.
      const routeId = page.route.id;
      if (!routeId) return;

      const target = resolve(`${routeId}?${params.toString()}`);
      replaceState(target, page.state);
    }, 400);

    return () => clearTimeout(timeout);
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
