<script lang="ts">
  import type { Snippet } from 'svelte';

  import { cn } from '$lib/shadcn/utils.js';

  interface Props {
    label: string;
    description?: string;
    class?: string;
    children: Snippet;
    actions?: Snippet;
  }

  let {
    label,
    description,
    class: className,
    children,
    actions,
  }: Props = $props();
</script>

<section
  class={cn(
    'rounded-[11px] border border-line bg-card px-[18px] py-4',
    className,
  )}
>
  <header class="flex items-start justify-between gap-4">
    <div class="flex items-start gap-2">
      <span
        aria-hidden="true"
        class="mt-0.5 h-3 w-[3px] shrink-0 rounded-sm bg-primary"
      ></span>
      <div>
        <h3 class="eyebrow">{label}</h3>
        {#if description}
          <p class="mt-1 text-xs text-muted-foreground">{description}</p>
        {/if}
      </div>
    </div>
    {#if actions}
      <div class="shrink-0">
        {@render actions()}
      </div>
    {/if}
  </header>
  <div class="mt-4 divide-y divide-line">
    {@render children()}
  </div>
</section>
