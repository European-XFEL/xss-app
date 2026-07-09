<script lang="ts">
  import { Atom, Beaker, Check } from '@lucide/svelte';

  import { cn } from '$lib/shadcn/utils';
  import { ChannelPanel } from '$lib/shared/ui';

  interface ChecklistItem {
    label: string;
    completed: boolean;
    icon: typeof Check;
  }

  interface Props {
    hasGroundMolecule: boolean;
    hasExcitedMolecule: boolean;
    hasSolvent: boolean;
  }

  let { hasGroundMolecule, hasExcitedMolecule, hasSolvent }: Props = $props();

  const items = $derived<ChecklistItem[]>([
    { label: 'Select Solvent', completed: hasSolvent, icon: Beaker },
    {
      label: 'Select Ground Molecule',
      completed: hasGroundMolecule,
      icon: Atom,
    },
    {
      label: 'Select Excited Molecule',
      completed: hasExcitedMolecule,
      icon: Atom,
    },
  ]);

  const completedCount = $derived(items.filter((i) => i.completed).length);
  const allComplete = $derived(completedCount === items.length);
</script>

<ChannelPanel
  label="Setup Required"
  description="Complete the following steps to generate scattering signals"
  class="w-full max-w-xl"
>
  <div class="py-3 first:pt-0">
    <div class="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div
        class="h-full bg-primary transition-all duration-300 ease-out"
        style="width: {(completedCount / items.length) * 100}%"
      ></div>
    </div>
    <p class="mt-2 text-right text-xs text-muted-foreground">
      {completedCount} of {items.length} completed
    </p>
  </div>

  {#each items as item (item.label)}
    <div class="flex items-center gap-3 py-3">
      <div
        class={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
          item.completed
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-primary/40 bg-transparent text-primary',
        )}
      >
        {#if item.completed}
          <Check class="h-3.5 w-3.5" />
        {:else}
          <item.icon class="h-3 w-3" />
        {/if}
      </div>
      <span>{item.label}</span>
      {#if item.completed}
        <span class="ml-auto text-xs text-muted-foreground">Done</span>
      {/if}
    </div>
  {/each}

  <div class="py-3 last:pb-0">
    {#if allComplete}
      <p class="text-sm text-primary">
        All set! Your scattering signals should now be displayed.
      </p>
    {:else}
      <p class="text-xs text-muted-foreground">
        Use the configuration panels on the right to complete setup
      </p>
    {/if}
  </div>
</ChannelPanel>
