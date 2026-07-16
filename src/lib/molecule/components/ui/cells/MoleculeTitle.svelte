<script lang="ts">
  import type { GroupRow, MoleculeSelection } from '../../columns';

  import { Button } from '$shadcn/ui/button';

  type Props = {
    group: GroupRow;
    selection: MoleculeSelection;
  };

  let { group, selection }: Props = $props();
</script>

<div class="flex items-baseline gap-2">
  <Button
    variant="ghost"
    size="sm"
    onclick={() => selection.selectGroup(group.molecules)}
  >
    {group?.moleculeName}
  </Button>
  <span class="text-xs whitespace-nowrap text-muted-foreground">
    {group.atomCount} atoms &middot; {group.molecules.length}
    {group.molecules.length === 1 ? 'file' : 'files'}
  </span>
</div>
