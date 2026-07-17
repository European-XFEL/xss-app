<script lang="ts">
  import { useSimulationState } from '$lib/app/simulation-context.svelte';
  import { serializeSimulationParams } from '$lib/app/simulation-url';
  import {
    Sidebar as AppSidebar,
    CommandBar,
    StatusBar,
  } from '$lib/widgets/nav';

  let { children } = $props();

  const simulation = useSimulationState();

  const sample = $derived({
    moleculeName: simulation.sample.ground?.moleculeName,
    groundName: simulation.sample.ground?.filename,
    excitedName: simulation.sample.excited?.filename,
    solventName: simulation.sample.solvent?.name,
    concentrationSoluteMolar: simulation.sample.concentrationSoluteMolar,
    computing: simulation.computing,
    computeError: simulation.computeError,
  });

  // Only ever invoked from the Share button's click handler (never at
  // module init or during SSR), so touching `window`/`navigator` here is
  // safe. `navigator.clipboard.writeText` rejects in non-secure contexts
  // or when permission is denied — surface the link via `console.warn` and
  // rethrow so `CommandBar` shows its "Copy failed" state instead of
  // silently swallowing the failure.
  async function handleShare(): Promise<void> {
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

    // Plain string concatenation rather than `new URL(...)` — the
    // `svelte/prefer-svelte-reactivity` lint rule flags the built-in
    // mutable `URL` class in `.svelte` files, and there's nothing reactive
    // here to justify `SvelteURL` either.
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.warn('Copy failed — share link:', shareUrl, error);
      throw error;
    }
  }
</script>

<div class="flex h-svh min-h-0 w-full flex-col">
  <CommandBar {sample} onShare={handleShare} />

  <div class="flex min-h-0 flex-1">
    <AppSidebar />

    <main class="min-h-0 flex-1 overflow-y-auto bg-canvas p-6">
      {@render children()}
    </main>
  </div>

  <StatusBar {sample} />
</div>
