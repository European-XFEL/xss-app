<script module lang="ts">
  /** Molecule visualization view mode, shared by MoleculePane and this toggle. */
  export type VizMode = 'trajectory' | 'individual';
</script>

<script lang="ts">
  import { cn } from '$lib/shadcn/utils.js';

  interface Props {
    value: VizMode;
  }

  let { value = $bindable() }: Props = $props();

  const modes: { id: VizMode; label: string }[] = [
    { id: 'trajectory', label: 'Trajectory' },
    { id: 'individual', label: 'Individual' },
  ];
</script>

<div class="inline-flex items-center gap-2 text-sm">
  <span class="text-muted-foreground">View</span>
  <div class="inline-flex rounded-md border border-line p-0.5">
    {#each modes as mode (mode.id)}
      <button
        type="button"
        onclick={() => (value = mode.id)}
        class={cn(
          'rounded px-2.5 py-1 text-xs font-medium transition-colors',
          value === mode.id
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {mode.label}
      </button>
    {/each}
  </div>
</div>
