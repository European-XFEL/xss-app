<script lang="ts">
  import { MessageSquare } from '@lucide/svelte';
  import * as Sentry from '@sentry/sveltekit';

  import { browser } from '$app/env';

  import * as Sidebar from '$shadcn/ui/sidebar/index.js';
  import * as Tooltip from '$shadcn/ui/tooltip/index.js';

  // undefined during SSR (the server bundle does not export getFeedback)
  // and when Sentry is disabled (no PUBLIC_SENTRY_DSN).
  const feedback = browser ? Sentry.getFeedback() : undefined;

  let form: Awaited<
    ReturnType<NonNullable<typeof feedback>['createForm']>
  > | null = null;

  async function openFeedback() {
    if (!feedback) return;
    Sentry.metrics.count('feedback.opened', 1);
    if (!form) {
      form = await feedback.createForm();
      form.appendToDom();
    }
    form.open();
  }
</script>

<Sidebar.MenuItem>
  {#if feedback}
    <Sidebar.MenuButton tooltipContent="Feedback" onclick={openFeedback}>
      <MessageSquare />
      <span>Feedback</span>
    </Sidebar.MenuButton>
  {:else}
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props: { type: _type, ...props } })}
          <span {...props} class="inline-flex w-full">
            <Sidebar.MenuButton aria-disabled="true" tabindex={-1}>
              <MessageSquare />
              <span>Feedback</span>
            </Sidebar.MenuButton>
          </span>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content side="right" align="center">
        Feedback is not configured
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}
</Sidebar.MenuItem>
