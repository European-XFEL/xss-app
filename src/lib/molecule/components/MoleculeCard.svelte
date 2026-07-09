<script lang="ts">
  import { Spinner } from '$shadcn/ui/spinner';

  import type { Sample } from '$lib/sample';
  import type { listMolecules } from '$lib/shared/api/api';
  import { ChannelPanel } from '$lib/shared/ui';

  import MoleculeFields from './MoleculeFields.svelte';

  type Molecules = Awaited<ReturnType<typeof listMolecules>>;

  type Props = {
    molecules: Molecules;
    ground?: Sample['ground'];
    excited?: Sample['excited'];
    loading?: boolean;
  };

  let {
    molecules,
    ground = $bindable(),
    excited = $bindable(),
    loading = false,
  }: Props = $props();
</script>

<ChannelPanel label="Molecule">
  {#snippet actions()}
    {#if loading}
      <Spinner />
    {/if}
  {/snippet}
  <MoleculeFields {molecules} bind:ground bind:excited {loading} />
</ChannelPanel>
