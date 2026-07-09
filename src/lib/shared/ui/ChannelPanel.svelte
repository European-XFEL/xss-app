<script lang="ts">
  import type { Snippet } from 'svelte';

  import * as Card from '$lib/shadcn/components/ui/card/index.js';
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
