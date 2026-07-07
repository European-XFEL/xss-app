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
    class={`h-7 px-2 text-xs ${selection.groundId === molecule.id ? 'border-blue-400 bg-blue-500 text-white hover:bg-blue-300' : 'hover:bg-gray-100'}`}
    onclick={() => selection.toggleGround(molecule)}
  >
    Ground
  </Button>
  <Button
    variant={selection.excitedId === molecule.id ? 'default' : 'outline'}
    size="sm"
    class={`h-7 px-2 text-xs ${selection.excitedId === molecule.id ? 'border-orange-400 bg-orange-500 text-white hover:bg-orange-300' : 'hover:bg-gray-100'}`}
    onclick={() => selection.toggleExcited(molecule)}
  >
    Excited
  </Button>
</div>
