<script lang="ts">
  import type { Molecule } from '../../../types';
  import type { MoleculeSelection } from '../../columns';

  import { Button } from '$shadcn/ui/button';

  type Props = {
    molecule: Molecule;
    selection: MoleculeSelection;
  };

  let { molecule, selection }: Props = $props();
</script>

<div class="flex items-center gap-1">
  <Button
    variant={selection.groundId === molecule.id ? 'default' : 'outline'}
    size="sm"
    class={`h-7 px-2 text-xs ${selection.groundId === molecule.id ? 'border-data-total bg-data-total text-white hover:bg-data-total/85' : 'hover:bg-muted'}`}
    onclick={() => selection.toggleGround(molecule)}
  >
    Ground
  </Button>
  <Button
    variant={selection.excitedId === molecule.id ? 'default' : 'outline'}
    size="sm"
    class={`h-7 px-2 text-xs ${selection.excitedId === molecule.id ? 'border-data-solute bg-data-solute text-white hover:bg-data-solute/85' : 'hover:bg-muted'}`}
    onclick={() => selection.toggleExcited(molecule)}
  >
    Excited
  </Button>
</div>
