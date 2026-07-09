<script lang="ts">
  import type { Sample, Solvents } from '../types';

  import { fade } from 'svelte/transition';

  import { Spinner } from '$shadcn/ui/spinner/index.js';

  import { ChannelPanel, NumSlider } from '$lib/shared/ui';

  import SolventSelect from './ui/SolventSelect.svelte';

  interface Props {
    solvent: Sample['solvent'];
    concentrationSoluteMolar: Sample['concentrationSoluteMolar'];
    solvents: Solvents;
    short?: boolean;
    loading?: boolean;
  }

  let {
    solvent = $bindable(),
    concentrationSoluteMolar = $bindable(),
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
  <div class="py-3 first:pt-0 last:pb-0">
    <SolventSelect bind:solvent {solvents} {loading} />
  </div>
  <div class="py-3 first:pt-0 last:pb-0">
    <NumSlider
      label="Solute Concentration (mol/L)"
      min="0.001"
      max="100"
      step="0.001"
      bind:value={concentrationSoluteMolar}
    />
  </div>
</ChannelPanel>
