<script lang="ts">
  import { useSimulationState } from '$lib/app/simulation-context.svelte';
  import { MoleculeCardSelection, MoleculeTableCard } from '$lib/molecule';
  import { SolventCard, SolventInfoCard } from '$lib/sample';

  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const simulation = useSimulationState();
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-wrap gap-6 [&>div]:min-w-sm [&>div]:flex-1">
    <SolventCard
      solvents={data.solvents}
      bind:solvent={simulation.sample.solvent}
      bind:concentrationSoluteMolar={simulation.sample.concentrationSoluteMolar}
    />
    <SolventInfoCard solvent={simulation.sample.solvent} />
    <MoleculeCardSelection
      ground={simulation.sample.ground}
      excited={simulation.sample.excited}
    />
  </div>

  <MoleculeTableCard
    molecules={data.molecules}
    ground={simulation.sample.ground}
    excited={simulation.sample.excited}
  />
</div>
