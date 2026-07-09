<script lang="ts">
  import { Spinner } from '$shadcn/ui/spinner/index.js';

  import { MoleculeFields } from '$lib/molecule';
  import type { Sample, Solvents } from '$lib/sample';
  import { SolventFields } from '$lib/sample';
  import type { listMolecules } from '$lib/shared/api/api';
  import { ChannelPanel } from '$lib/shared/ui';

  type Molecules = Awaited<ReturnType<typeof listMolecules>>;

  interface Props {
    solvent: Sample['solvent'];
    concentrationSoluteMolar: Sample['concentrationSoluteMolar'];
    solvents: Solvents;
    molecules: Molecules;
    ground?: Sample['ground'];
    excited?: Sample['excited'];
    loading?: boolean;
  }

  let {
    solvent = $bindable(),
    concentrationSoluteMolar = $bindable(),
    solvents,
    molecules,
    ground = $bindable(),
    excited = $bindable(),
    loading = false,
  }: Props = $props();
</script>

<ChannelPanel
  label="Sample"
  description="Solvent, solute concentration, and ground/excited molecule states."
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
