<script lang="ts">
  import { useSimulationState } from '$lib/app/simulation-context.svelte';
  import { ProbeSetupCard } from '$lib/probe';
  import { PumpSetupCard } from '$lib/pump';

  const simulation = useSimulationState();
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
  <PumpSetupCard bind:pump={simulation.pump} />
  <ProbeSetupCard bind:probe={simulation.probe} />
</div>
