<script lang="ts">
  import type {
    GroupRow,
    MoleculeRow,
    MoleculeTableEditing,
  } from '../../columns';
  import Pencil from '@lucide/svelte/icons/pencil';

  import { Button } from '$shadcn/ui/button';

  // Renders the edit affordances for either a group header row (edit
  // molecule) or a structure file row (edit file).
  type Props = {
    editing: MoleculeTableEditing;
    group?: GroupRow;
    molecule?: MoleculeRow;
  };

  let { editing, group, molecule }: Props = $props();
</script>

{#if group}
  <div class="flex items-center justify-end gap-1">
    <Button
      variant="outline"
      size="sm"
      class="h-7 px-2 text-xs"
      disabled={!editing.enabled}
      onclick={() => editing.onEditMolecule(group)}
    >
      <Pencil class="size-3" />
      Edit molecule
    </Button>
  </div>
{:else if molecule}
  <div class="flex justify-end">
    <Button
      variant="ghost"
      size="icon"
      class="size-7"
      disabled={!editing.enabled}
      onclick={() => editing.onEditFile(molecule)}
    >
      <Pencil class="size-3.5" />
      <span class="sr-only">Edit structure file</span>
    </Button>
  </div>
{/if}
