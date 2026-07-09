<script lang="ts">
  import { useSimulationState } from '$lib/app/simulation-context.svelte';
  import { MoleculeCardSelection, MoleculeTableCard } from '$lib/molecule';
  import { SolventCard, SolventInfoCard } from '$lib/sample';
  import { listMolecules, listSolvents } from '$lib/shared/api/api';
  import { createScatteringResource } from '$lib/simulation';

  const simulation = useSimulationState();

  type ListsResult = {
    solvents: Awaited<ReturnType<typeof listSolvents>>;
    molecules: Awaited<ReturnType<typeof listMolecules>>;
  };

  const listResource = createScatteringResource<ListsResult>(
    async () => {
      const [solvents, molecules] = await Promise.all([
        listSolvents(),
        listMolecules(),
      ]);
      return { solvents, molecules };
    },
    () => true,
  );

  const solvents = $derived(listResource.value?.solvents ?? []);
  const molecules = $derived(listResource.value?.molecules ?? []);
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-wrap gap-6 [&>div]:min-w-sm [&>div]:flex-1">
    <SolventCard
      {solvents}
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
    {molecules}
    ground={simulation.sample.ground}
    excited={simulation.sample.excited}
    onToggleGround={(molecule) => simulation.sample.toggleGround(molecule)}
    onToggleExcited={(molecule) => simulation.sample.toggleExcited(molecule)}
    onSelectGroup={(molecules) => simulation.sample.selectGroup(molecules)}
  />
</div>
