<script lang="ts">
  import Upload from '@lucide/svelte/icons/upload';

  import { Button } from '$shadcn/ui/button';
  import * as Tooltip from '$shadcn/ui/tooltip';

  import type { Capability } from '$lib/shared/health';

  type Props = {
    rowCount: number;
    groupCount: number;
    capability: Capability;
    onUpload: () => void;
  };

  let { rowCount, groupCount, capability, onUpload }: Props = $props();
</script>

<div class="flex items-center justify-between text-sm text-muted-foreground">
  {#if capability.available}
    <Button variant="outline" size="sm" onclick={onUpload}>
      <Upload class="size-3.5" />
      Add molecule
    </Button>
  {:else}
    <Tooltip.Root>
      <Tooltip.Trigger>
        <span class="inline-flex">
          <Button variant="outline" size="sm" disabled>
            <Upload class="size-3.5" />
            Add molecule
          </Button>
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content side="top" align="center">
        {capability.reason}
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}

  <div>
    {rowCount} structure files across
    {groupCount} molecules
  </div>
</div>
