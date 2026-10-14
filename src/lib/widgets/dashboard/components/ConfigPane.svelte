<script lang="ts">
  // Exception to the widget→app boundary: ConfigPane must read the shared
  // simulation state from context rather than as a prop. The dashboard renders
  // it inside third-party snippet-rendering components (paneforge pane +
  // bits-ui ScrollArea) whose boundaries break Svelte's binding-ownership
  // chain — prop-drilling the state and binding into it trips
  // ownership_invalid_binding, and `bind:` cannot satisfy the check because the
  // recorded parent is always the (uneditable) third-party component. Reading
  // from context removes the prop-crossing entirely.
  // eslint-disable-next-line boundaries/dependencies
  import { useSimulationState } from '$lib/app/simulation-context.svelte';
  import { DetectorSetupCard } from '$lib/detector';
  import { PumpSetupCard } from '$lib/pump';

  import SampleCard from './SampleCard.svelte';

  const { molecules, solvents, short } = $props();

  const simulation = useSimulationState();
</script>

<div
  class={short
    ? 'flex flex-col divide-y divide-line *:flex-1'
    : 'flex flex-col gap-4 *:flex-1'}
>
  <SampleCard
    {solvents}
    {molecules}
    {short}
    bind:concentrationSoluteMmol={simulation.sample.concentrationSoluteMmol}
    bind:solvent={simulation.sample.solvent}
    bind:ground={simulation.sample.ground}
    bind:excited={simulation.sample.excited}
  />
  <DetectorSetupCard
    bind:distance={simulation.detector.distance}
    bind:beamCenter={simulation.detector.beamCenter}
    {short}
  />
  <PumpSetupCard bind:pump={simulation.pump} {short} />
</div>
