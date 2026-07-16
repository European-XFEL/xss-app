<script lang="ts">
  import type { Molecule, Molecules } from '../types';

  import { fade } from 'svelte/transition';

  import * as Card from '$shadcn/ui/card';
  import { Spinner } from '$shadcn/ui/spinner';

  import MoleculeDataTable from './ui/MoleculeTable.svelte';

  interface Props {
    molecules: Molecules;
    ground?: Molecule | null;
    excited?: Molecule | null;
    loading?: boolean;
    onToggleGround: (molecule: Molecule) => void;
    onToggleExcited: (molecule: Molecule) => void;
    onSelectGroup: (molecules: Molecule[]) => void;
  }

  let {
    ground,
    excited,
    molecules,
    loading = false,
    onToggleGround,
    onToggleExcited,
    onSelectGroup,
  }: Props = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>
      Molecule Library
      {#if loading}
        <div transition:fade class="absolute ml-2 inline-block">
          <Spinner />
        </div>
      {/if}
    </Card.Title>
    <Card.Description>
      Use the Ground and Excited buttons to select molecules for analysis, and
      the edit buttons to change a molecule or a structure file.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <MoleculeDataTable
      {ground}
      {excited}
      {molecules}
      {onToggleGround}
      {onToggleExcited}
      {onSelectGroup}
    />
  </Card.Content>
</Card.Root>
