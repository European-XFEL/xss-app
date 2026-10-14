<script lang="ts">
  import type { Sample, Solvents } from '../types';

  import { fade } from 'svelte/transition';

  import { Spinner } from '$shadcn/ui/spinner/index.js';

  import { ChannelPanel } from '$lib/shared/ui';

  import SolventFields from './SolventFields.svelte';

  interface Props {
    solvent: Sample['solvent'];
    concentrationSoluteMmol: Sample['concentrationSoluteMmol'];
    solvents: Solvents;
    short?: boolean;
    loading?: boolean;
  }

  let {
    solvent = $bindable(),
    concentrationSoluteMmol = $bindable(),
    solvents,
    short = false,
    loading = false,
  }: Props = $props();
</script>

<ChannelPanel
  label="Solvent"
  description={short
    ? undefined
    : 'Parameters shared by both ground and excited states. The choice of solvent defines the maximum Q range.'}
>
  {#snippet actions()}
    {#if loading}
      <div transition:fade>
        <Spinner />
      </div>
    {/if}
  {/snippet}
  <SolventFields
    bind:solvent
    bind:concentrationSoluteMmol
    {solvents}
    {loading}
  />
</ChannelPanel>
