<script lang="ts">
  import type { Snippet } from 'svelte';

  import * as Card from '$lib/shadcn/components/ui/card/index.js';
  import { cn } from '$lib/shadcn/utils.js';

  interface Props {
    label: string;
    description?: string;
    /**
     * `card` (default) wraps the panel in a bordered Card — used on the
     * standalone experiment pages. `flat` drops the card chrome for the
     * "Airy" config sidebar: the section sits directly on the pane surface
     * with a muted label, relying on the parent's `divide-y` hairline rules
     * and generous padding to do the grouping the card fill used to.
     */
    variant?: 'card' | 'flat';
    class?: string;
    children: Snippet;
    actions?: Snippet;
  }

  let {
    label,
    description,
    variant = 'card',
    class: className,
    children,
    actions,
  }: Props = $props();
</script>

{#if variant === 'flat'}
  <section class={cn('px-4 py-6', className)}>
    <div class="mb-4 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span
          aria-hidden="true"
          class="h-3 w-[3px] shrink-0 rounded-sm bg-primary"
        ></span>
        <span
          class="text-xs font-medium tracking-wider text-muted-foreground/80 uppercase"
        >
          {label}
        </span>
      </div>
      {#if actions}
        {@render actions()}
      {/if}
    </div>
    <div class="divide-y divide-line">
      {@render children()}
    </div>
  </section>
{:else}
  <Card.Root class={cn('rounded-[11px] border border-line ring-0', className)}>
    <Card.Header>
      <div class="flex items-start gap-2">
        <span
          aria-hidden="true"
          class="mt-0.5 h-3 w-[3px] shrink-0 rounded-sm bg-primary"
        ></span>
        <div>
          <Card.Title>{label}</Card.Title>
          {#if description}
            <Card.Description class="mt-1">{description}</Card.Description>
          {/if}
        </div>
      </div>
      {#if actions}
        <Card.Action>
          {@render actions()}
        </Card.Action>
      {/if}
    </Card.Header>
    <Card.Content class="divide-y divide-line">
      {@render children()}
    </Card.Content>
  </Card.Root>
{/if}
