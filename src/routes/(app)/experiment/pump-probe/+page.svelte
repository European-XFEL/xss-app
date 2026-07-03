<script lang="ts">
  import { useSimulationState } from '$lib/app/simulation-context.svelte';
  import { ProbeSetupCard } from '$lib/probe';
  import { PumpSetupCard } from '$lib/pump';

  const simulation = useSimulationState();
</script>

<div class="flex flex-wrap gap-6 *:min-w-sm *:flex-1">
  <PumpSetupCard bind:pump={simulation.pump} />
  <ProbeSetupCard bind:probe={simulation.probe} />
</div>
