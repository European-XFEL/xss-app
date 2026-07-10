<script lang="ts">
  import '$css';

  import { onMount, untrack } from 'svelte';

  import { replaceState } from '$app/navigation';
  import { asset, resolve } from '$app/paths';
  import { page } from '$app/state';

  import * as Sidebar from '$shadcn/ui/sidebar/index.js';

  import {
    createSimulationState,
    setSimulationState,
  } from '$lib/app/simulation-context.svelte';
  import { hasEncodedSimulationParams } from '$lib/app/simulation-url';

  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();

  // Seeded from `+layout.server.ts`, which resolves any simulation setup
  // encoded in the URL — SSR and the first client render agree by
  // construction, so a hard reload or a shared link restores the setup
  // instead of hydrating into "SETUP INCOMPLETE" (initial-dev-2ae). Only
  // the *initial* `data.simulationSetup` is used to seed state — once
  // created, `simulation` is the single source of truth; the URL is no
  // longer kept in sync with it (see the Share button instead) and is
  // never read again after this point.
  const simulation = createSimulationState(untrack(() => data.simulationSetup));
  setSimulationState(simulation);

  // A shared/legacy link's params are only meaningful for the one restore
  // above — once `simulation` has been seeded, leaving them in the address
  // bar is stale and confusing (e.g. it looks "unsaved-but-synced" even
  // though edits no longer write back to the URL). Clean the URL back to
  // the plain path exactly once, on mount, rather than a recurring
  // `$effect` (which could refire and fight a later, unrelated query
  // param). `page.state` is passed through (not omitted) so this preserves
  // any shallow-routing state already attached to the current history
  // entry.
  onMount(() => {
    if (!hasEncodedSimulationParams(page.url.searchParams)) return;

    const routeId = page.route.id;
    if (!routeId) return;

    replaceState(resolve(routeId), page.state);
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
