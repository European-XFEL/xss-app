<script lang="ts">
  import {
    type NavSample,
    getRunTitle,
    isSetupComplete,
  } from '../lib/run-context';
  import FlaskRoundIcon from '@lucide/svelte/icons/flask-round';

  interface Props {
    /** Omit to render the brand-only bar (e.g. a future landing page). */
    sample?: NavSample;
  }

  let { sample }: Props = $props();

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

        <!-- Third state (e.g. "COMPUTING") can be added by extending this
             condition once a recomputing signal exists. -->
        {#if setupComplete}
          <span
            class="rounded-full bg-[rgba(47,163,122,.16)] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-status-ok-dot"
          >
            READY
          </span>
        {:else}
          <span
            class="rounded-full bg-[rgba(255,255,255,.08)] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-chrome-meta"
          >
            SETUP INCOMPLETE
          </span>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    <!-- Save run / Export / Add to compare actions land here. -->
  </div>
</header>
