<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Settings2 from '@lucide/svelte/icons/settings-2';
  import type { Table } from '@tanstack/table-core';

  import { Button } from '$shadcn/ui/button';
  import * as DropdownMenu from '$shadcn/ui/dropdown-menu';
  import { Input } from '$shadcn/ui/input';
  import * as Tooltip from '$shadcn/ui/tooltip';

  import type { Capability } from '$lib/shared/health';

  type Props = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: Table<any>;
    globalFilter: string;
    onGlobalFilterChange: (value: string) => void;
    capability: Capability;
    onUpload: () => void;
  };

  let {
    table,
    globalFilter,
    onGlobalFilterChange,
    capability,
    onUpload,
  }: Props = $props();

  function handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    onGlobalFilterChange(target.value);
  }
</script>

<div class="flex items-center justify-between gap-4">
  <div class="flex items-center gap-2">
    <Input
      placeholder="Search molecules..."
      value={globalFilter}
      oninput={handleInputChange}
      class="h-9 w-64"
    />
    {#if capability.available}
      <Button variant="outline" onclick={onUpload}>Upload</Button>
    {:else}
      <Tooltip.Root>
        <Tooltip.Trigger>
          <span class="inline-flex">
            <Button variant="outline" disabled>Upload</Button>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content side="top" align="center">
          {capability.reason}
        </Tooltip.Content>
      </Tooltip.Root>
    {/if}
  </div>
  <div class="flex items-center gap-2">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button variant="outline" size="sm" class="bg-transparent" {...props}>
            <Settings2 class="mr-2 size-4" />
            Columns
            <ChevronDown class="ml-2 size-4" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-45">
        {#each table
          .getAllColumns()
          .filter((col) => col.getCanHide()) as column (column.id)}
          <DropdownMenu.CheckboxItem
            checked={column.getIsVisible()}
            onCheckedChange={(value) => {
              column.toggleVisibility(!!value);
            }}
          >
            {column.id}
          </DropdownMenu.CheckboxItem>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
</div>
