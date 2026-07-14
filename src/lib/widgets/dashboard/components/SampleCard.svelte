<script lang="ts">
  import { Spinner } from '$shadcn/ui/spinner/index.js';

  import { MoleculeFields } from '$lib/molecule';
  import type { Sample, Solvents } from '$lib/sample';
  import { SolventFields } from '$lib/sample';
  import type { MoleculeInfo } from '$lib/shared/contracts';
  import { ChannelPanel } from '$lib/shared/ui';

  type Molecules = MoleculeInfo[];

  interface Props {
    solvent: Sample['solvent'];
    concentrationSoluteMolar: Sample['concentrationSoluteMolar'];
    solvents: Solvents;
    molecules: Molecules;
    ground?: Sample['ground'];
    excited?: Sample['excited'];
    loading?: boolean;
    short?: boolean;
  }

  let {
    solvent = $bindable(),
    concentrationSoluteMolar = $bindable(),
    solvents,
    molecules,
    ground = $bindable(),
    excited = $bindable(),
    loading = false,
    short = false,
  }: Props = $props();
</script>

<ChannelPanel
  label="Sample"
  variant={short ? 'flat' : 'card'}
  description={short
    ? undefined
    : 'Solvent, solute concentration, and ground/excited molecule states.'}
>
  {#snippet actions()}
    {#if loading}
      <Spinner />
    {/if}
  {/snippet}
  <SolventFields
    bind:solvent
    bind:concentrationSoluteMolar
    {solvents}
    {loading}
  />
  <MoleculeFields {molecules} bind:ground bind:excited {loading} />
</ChannelPanel>
