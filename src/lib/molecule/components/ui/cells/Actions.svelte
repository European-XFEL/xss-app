<script lang="ts">
  import type {
    GroupRow,
    MoleculeRow,
    MoleculeTableEditing,
  } from '../../columns';
  import FileUp from '@lucide/svelte/icons/file-up';
  import Pencil from '@lucide/svelte/icons/pencil';

  import { Button } from '$shadcn/ui/button';
  import * as Tooltip from '$shadcn/ui/tooltip';

  // Renders the edit affordances for either a group header row (edit
  // molecule / add file) or a structure file row (edit file).
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
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="outline"
            size="icon"
            class="size-7"
            disabled={!editing.enabled}
            onclick={() => editing.onAddFile(group.moleculeName)}
          >
            <FileUp class="size-3.5" />
            <span class="sr-only">Add structure file</span>
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content side="top" align="center">Add structure file</Tooltip.Content>
    </Tooltip.Root>
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
