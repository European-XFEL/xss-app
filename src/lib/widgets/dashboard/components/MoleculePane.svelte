<script lang="ts">
  import { MoleculeTrajectoryViz, MoleculeViz } from '$lib/molecule';
  import type { SampleState } from '$lib/sample';
  import { Placeholder } from '$lib/shared/ui';

  import type { VizMode } from './types';

  interface Props {
    sample: SampleState;
    hasAll?: boolean;
    vizMode?: VizMode;
  }

  let { sample, hasAll = true, vizMode = 'trajectory' }: Props = $props();

  const hasGround = $derived(!!sample.ground?.id);
  const hasExcited = $derived(!!sample.excited?.id);

  const canVisualize = $derived(hasAll && hasGround && hasExcited);
</script>

{#if canVisualize}
  {#if vizMode === 'trajectory'}
    <MoleculeTrajectoryViz ground={sample.ground} excited={sample.excited} />
  {:else}
    <div class="grid gap-3 md:grid-cols-2">
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold text-muted-foreground">Ground State</h3>
        <MoleculeViz molecule={sample.ground} />
      </div>
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold text-muted-foreground">
          Excited State
        </h3>
        <MoleculeViz molecule={sample.excited} />
      </div>
    </div>
  {/if}
{:else}
  <Placeholder
    title="Select ground and excited molecules"
    description="Choose a ground and excited molecule to visualize their structures."
  />
{/if}
