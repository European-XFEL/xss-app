<script lang="ts">
  import {
    type NavSample,
    getRunTitle,
    isSetupComplete,
  } from '../lib/run-context';
  import FlaskRoundIcon from '@lucide/svelte/icons/flask-round';
  import MonitorIcon from '@lucide/svelte/icons/monitor';
  import MoonIcon from '@lucide/svelte/icons/moon';
  import SunIcon from '@lucide/svelte/icons/sun';
  import { mode, setMode, userPrefersMode } from 'mode-watcher';

  import { type Snippet, onDestroy } from 'svelte';

  import { page } from '$app/state';

  import * as DropdownMenu from '$shadcn/ui/dropdown-menu/index.js';
  import * as Tooltip from '$shadcn/ui/tooltip/index.js';

  interface Props {
    /** Omit to render the brand-only bar (e.g. a future landing page). */
    sample?: NavSample;
    /** Replaces the default Save run / Export / Add to compare actions. */
    actions?: Snippet;
    /** Copy a shareable link for the current setup to the clipboard. Only
     * rendered (as an enabled "Share" button, alongside the default
     * actions) when provided. */
    onShare?: () => void | Promise<void>;
  }

  let { sample, actions, onShare }: Props = $props();

  const setupComplete = $derived(sample ? isSetupComplete(sample) : false);
  const runTitle = $derived(sample ? getRunTitle(sample) : '');

  // Share links encode molecule/solvent ids that only resolve against the
  // shared backend — unavailable in local browser storage mode (static
  // target, or node's backendless-storage toggle), where they'd only ever
  // resolve on the same browser that made them (initial-dev-i38).
  const shareCapability = $derived(page.data.capabilities.share);

  type ShareStatus = 'idle' | 'copied' | 'failed';
  let shareStatus: ShareStatus = $state('idle');
  let resetShareStatus: ReturnType<typeof setTimeout> | undefined;

  const SHARE_LABEL: Record<ShareStatus, string> = {
    idle: 'Share',
    copied: 'Copied!',
    failed: 'Copy failed',
  };

  async function handleShareClick(): Promise<void> {
    if (!onShare) return;

    try {
      await onShare();
      shareStatus = 'copied';
    } catch {
      shareStatus = 'failed';
    }

    clearTimeout(resetShareStatus);
    resetShareStatus = setTimeout(() => {
      shareStatus = 'idle';
    }, 1500);
  }

  onDestroy(() => clearTimeout(resetShareStatus));
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
    <span class="text-sm font-semibold text-chrome-fg">
      Scattering Simulator
    </span>

    {#if sample}
      <div class="h-[22px] w-px bg-[rgba(255,255,255,.1)]"></div>

      <div class="flex items-center gap-2.5">
        <div class="flex flex-col leading-tight">
          <span class="text-sm font-bold text-chrome-fg">{runTitle}</span>
          <span class="font-mono text-xs text-chrome-meta">unsaved</span>
        </div>

        {#if !setupComplete}
          <span
            class="rounded-full bg-[rgba(255,255,255,.08)] px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-chrome-meta"
          >
            SETUP INCOMPLETE
          </span>
        {:else if sample.computing}
          <span
            class="rounded-full bg-[rgba(255,255,255,.08)] px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-chrome-meta"
          >
            COMPUTING
          </span>
        {:else}
          <span
            class="rounded-full bg-[rgba(47,163,122,.16)] px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-status-ok-dot"
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
      {#if onShare}
        {#if shareCapability.available}
          <button
            type="button"
            onclick={handleShareClick}
            class="rounded-[7px] border border-[rgba(255,255,255,.18)] px-2.5 py-1.5 text-sm font-medium text-chrome-btn"
          >
            {SHARE_LABEL[shareStatus]}
          </button>
        {:else}
          <Tooltip.Root>
            <Tooltip.Trigger>
              {#snippet child({ props: { type: _type, ...props } })}
                <span {...props} class="inline-flex">
                  <button
                    type="button"
                    disabled
                    class="rounded-[7px] border border-[rgba(255,255,255,.18)] px-2.5 py-1.5 text-sm font-medium text-chrome-btn disabled:pointer-events-none disabled:opacity-50"
                  >
                    Share
                  </button>
                </span>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content>{shareCapability.reason}</Tooltip.Content>
          </Tooltip.Root>
        {/if}
      {/if}

      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props: { type: _type, ...props } })}
            <span {...props} class="inline-flex">
              <button
                type="button"
                disabled
                class="rounded-[7px] border border-[rgba(255,255,255,.18)] px-2.5 py-1.5 text-sm font-medium text-chrome-btn disabled:pointer-events-none disabled:opacity-50"
              >
                Save run
              </button>
            </span>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>Coming soon</Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props: { type: _type, ...props } })}
            <span {...props} class="inline-flex">
              <button
                type="button"
                disabled
                class="rounded-[7px] border border-[rgba(255,255,255,.18)] px-2.5 py-1.5 text-sm font-medium text-chrome-btn disabled:pointer-events-none disabled:opacity-50"
              >
                Export
              </button>
            </span>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>Coming soon</Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props: { type: _type, ...props } })}
            <span {...props} class="inline-flex">
              <button
                type="button"
                disabled
                class="rounded-[7px] bg-primary px-2.5 py-1.5 text-sm font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                Add to compare
              </button>
            </span>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>Coming soon</Tooltip.Content>
      </Tooltip.Root>
    {/if}

    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Change theme (system, light, or dark)"
        class="rounded-[7px] border border-[rgba(255,255,255,.18)] p-1.5 text-chrome-btn"
      >
        {#if userPrefersMode.current === 'system'}
          <MonitorIcon class="size-4" />
        {:else if mode.current === 'dark'}
          <MoonIcon class="size-4" />
        {:else}
          <SunIcon class="size-4" />
        {/if}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.RadioGroup
          value={userPrefersMode.current}
          onValueChange={(value) =>
            setMode(value as 'system' | 'light' | 'dark')}
        >
          <DropdownMenu.RadioItem value="system">System</DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem value="light">Light</DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem value="dark">Dark</DropdownMenu.RadioItem>
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
</header>
