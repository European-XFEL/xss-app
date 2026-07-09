<script lang="ts">
  import { useSimulationState } from '$lib/app/simulation-context.svelte';
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
  });
</script>

<div class="flex h-svh min-h-0 w-full flex-col">
  <CommandBar />

  <div class="flex min-h-0 flex-1">
    <AppSidebar />

    <main class="min-h-0 flex-1 overflow-y-auto bg-canvas">
      {@render children()}
    </main>
  </div>

  <StatusBar {sample} />
</div>
