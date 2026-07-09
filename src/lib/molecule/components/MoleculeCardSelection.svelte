<script lang="ts">
  import type { Molecule } from '../types';

  import { ChannelPanel } from '$lib/shared/ui';

  interface Props {
    ground?: Molecule | null;
    excited?: Molecule | null;
  }

  let { ground = null, excited = null }: Props = $props();
</script>

<ChannelPanel
  label="Selected Molecules"
  description="Your current ground and excited state selection."
>
  <div class="flex flex-wrap gap-6 py-3 first:pt-0 last:pb-0">
    <!-- Ground State -->
    <div class="min-w-40 flex-1 space-y-2">
      <div class="flex items-center gap-2">
        <div
          class="h-2 w-2 rounded-full {ground
            ? 'bg-data-total'
            : 'bg-muted-foreground/40'}"
          aria-hidden="true"
        ></div>
        <span class="text-sm font-medium text-muted-foreground"
          >Ground State</span
        >
      </div>
      <div
        class="flex h-12 flex-col justify-center border-l-2 pl-4 {ground
          ? 'border-data-total'
          : 'border-border'}"
      >
        {#if ground}
          <p class="leading-tight font-medium">
            {ground.moleculeName}
          </p>
          <p class="text-sm leading-tight text-muted-foreground">
            {ground.filename}
          </p>
        {:else}
          <p class="text-sm text-muted-foreground">No molecule selected</p>
        {/if}
      </div>
    </div>

    <!-- Excited State -->
    <div class="min-w-40 flex-1 space-y-2">
      <div class="flex items-center gap-2">
        <div
          class="h-2 w-2 rounded-full {excited
            ? 'bg-data-solute'
            : 'bg-muted-foreground/40'}"
          aria-hidden="true"
        ></div>
        <span class="text-sm font-medium text-muted-foreground"
          >Excited State</span
        >
      </div>
      <div
        class="flex h-12 flex-col justify-center border-l-2 pl-4 {excited
          ? 'border-data-solute'
          : 'border-border'}"
      >
        {#if excited}
          <p class="leading-tight font-medium">
            {excited.moleculeName}
          </p>
          <p class="text-sm leading-tight text-muted-foreground">
            {excited.filename}
          </p>
        {:else}
          <p class="text-sm text-muted-foreground">No molecule selected</p>
        {/if}
      </div>
    </div>
  </div>
</ChannelPanel>
