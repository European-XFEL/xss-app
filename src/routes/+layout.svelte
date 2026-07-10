<script lang="ts">
  import '$css';

  import { untrack } from 'svelte';

  import { afterNavigate, replaceState } from '$app/navigation';
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
  // the plain path once the params have done their job.
  //
  // `afterNavigate` fires for the very first load too, but SvelteKit's
  // client-side router runs *all* registered `afterNavigate` (and
  // `onMount`) callbacks synchronously as part of its own `initialize()`,
  // before it flips the internal flag that makes `replaceState` legal to
  // call — calling it directly here throws "cannot be called before
  // router is initialized". Deferring one tick with `setTimeout` runs
  // after `initialize()` has returned, once the router considers itself
  // started. `afterNavigate` fires again on every later navigation too,
  // but `hasEncodedSimulationParams` is false by then (this same check
  // already cleaned the params), so this is naturally a no-op afterward
  // rather than needing a one-time guard. `page.state` is passed through
  // (not omitted) so this preserves any shallow-routing state already
  // attached to the current history entry.
  afterNavigate(() => {
    if (!hasEncodedSimulationParams(page.url.searchParams)) return;

    const routeId = page.route.id;
    if (!routeId) return;

    setTimeout(() => replaceState(resolve(routeId), page.state));
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
