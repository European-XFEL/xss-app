<script lang="ts">
  import type { GroupRow, MoleculeSelection } from '../../columns';

  import { Button } from '$shadcn/ui/button';

  type Props = {
    group: GroupRow;
    selection: MoleculeSelection;
  };

  let { group, selection }: Props = $props();
</script>

<Button
  variant="ghost"
  size="sm"
  onclick={() => selection.selectGroup(group.molecules)}
>
  {group?.moleculeName}
</Button>
