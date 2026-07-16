<script lang="ts">
  import { useSimulationState } from '$lib/app/simulation-context.svelte';
  import { MoleculeCardSelection, MoleculeTableCard } from '$lib/molecule';
  import { listMolecules } from '$lib/molecule';
  import { SolventCard, SolventInfoCard } from '$lib/sample';
  import { listSolvents } from '$lib/sample/solvent.remote';

  const simulation = useSimulationState();

  // Stable remote-function instances: `.current` starts undefined and
  // updates reactively, including after the upload form's single-flight
  // `listMolecules` refresh (see molecule.remote.ts).
  const moleculesQuery = listMolecules();
  const solventsQuery = listSolvents();

  const solvents = $derived(solventsQuery.current ?? []);
  const molecules = $derived(moleculesQuery.current ?? []);
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-wrap gap-6 *:min-w-sm *:flex-1">
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
