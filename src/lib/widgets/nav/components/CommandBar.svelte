<script lang="ts">
  import {
    type NavSample,
    getRunTitle,
    isSetupComplete,
  } from '../lib/run-context';
  import FlaskRoundIcon from '@lucide/svelte/icons/flask-round';

  import type { Snippet } from 'svelte';

  import * as Tooltip from '$shadcn/ui/tooltip/index.js';

  interface Props {
    /** Omit to render the brand-only bar (e.g. a future landing page). */
    sample?: NavSample;
    /** Replaces the default Save run / Export / Add to compare actions. */
    actions?: Snippet;
  }

  let { sample, actions }: Props = $props();

  const setupComplete = $derived(sample ? isSetupComplete(sample) : false);
  const runTitle = $derived(sample ? getRunTitle(sample) : '');
</script>

<header
  class="flex h-[52px] shrink-0 items-center justify-between bg-chrome px-[18px]"
>
  <div class="flex items-center gap-2.5">
    <div
      class="flex size-[25px] shrink-0 items-center justify-center rounded-[6px] bg-primary text-primary-foreground"
    >
      <FlaskRoundIcon class="size-3.5" />
    </div>
    <span class="text-[12.5px] font-semibold text-chrome-fg">
      Scattering Simulator
    </span>

    {#if sample}
      <div class="h-[22px] w-px bg-[rgba(255,255,255,.1)]"></div>

      <div class="flex items-center gap-2.5">
        <div class="flex flex-col leading-tight">
          <span class="text-[14px] font-bold text-chrome-fg">{runTitle}</span>
          <span class="font-mono text-[10.5px] text-chrome-meta">unsaved</span>
        </div>

        {#if !setupComplete}
          <span
            class="rounded-full bg-[rgba(255,255,255,.08)] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-chrome-meta"
          >
            SETUP INCOMPLETE
          </span>
        {:else if sample.computing}
          <span
            class="rounded-full bg-[rgba(255,255,255,.08)] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-chrome-meta"
          >
            COMPUTING
          </span>
        {:else}
          <span
            class="rounded-full bg-[rgba(47,163,122,.16)] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-status-ok-dot"
          >
            READY
          </span>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    {#if actions}
      {@render actions()}
    {:else}
      <Tooltip.Root>
        <Tooltip.Trigger>
          <span class="inline-flex">
            <button
              type="button"
              disabled
              class="rounded-[7px] border border-[rgba(255,255,255,.18)] px-2.5 py-1.5 text-[12px] font-medium text-chrome-btn disabled:pointer-events-none disabled:opacity-50"
            >
              Save run
            </button>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content>Coming soon</Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger>
          <span class="inline-flex">
            <button
              type="button"
              disabled
              class="rounded-[7px] border border-[rgba(255,255,255,.18)] px-2.5 py-1.5 text-[12px] font-medium text-chrome-btn disabled:pointer-events-none disabled:opacity-50"
            >
              Export
            </button>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content>Coming soon</Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger>
          <span class="inline-flex">
            <button
              type="button"
              disabled
              class="rounded-[7px] bg-primary px-2.5 py-1.5 text-[12px] font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              Add to compare
            </button>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content>Coming soon</Tooltip.Content>
      </Tooltip.Root>
    {/if}
  </div>
</header>
