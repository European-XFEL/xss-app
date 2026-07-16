<script lang="ts">
  import { Settings } from '@lucide/svelte';

  import { browser } from '$app/env';

  import { Label } from '$shadcn/ui/label/index.js';
  import * as Popover from '$shadcn/ui/popover/index.js';
  import * as Sidebar from '$shadcn/ui/sidebar/index.js';
  import { Switch } from '$shadcn/ui/switch/index.js';

  import { cn } from '$lib/shadcn/utils.js';

  import {
    hasSeenSettings,
    markSettingsSeen,
    SETTINGS_SCHEMA,
    settings,
  } from './settings.svelte';

  // First visit (popover never opened before): auto-open it and emphasise
  // the entry so the user notices it rather than silently defaulting.
  // `browser` guards SSR, where cookies aren't readable and the popover
  // should render closed anyway.
  const unseen = browser && !hasSeenSettings();
  let firstVisit = $state(unseen);
  let open = $state(unseen);

  $effect(() => {
    if (!open) {
      if (firstVisit) markSettingsSeen();
      firstVisit = false;
    }
  });
</script>

<Sidebar.MenuItem>
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Sidebar.MenuButton
          {...props}
          tooltipContent="Settings"
          class={cn(firstVisit && 'animate-pulse ring-2 ring-primary')}
        >
          <Settings />
          <span>Settings</span>
        </Sidebar.MenuButton>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content side="right" align="end" class="grid gap-4">
      <div class="grid gap-0.5">
        <p class="text-sm font-medium">Settings</p>
        <p class="text-xs text-muted-foreground">
          Preferences for this browser, stored in a cookie.
        </p>
      </div>
      {#each SETTINGS_SCHEMA as def (def.id)}
        <div class="flex items-start justify-between gap-4">
          <div class="grid gap-0.5">
            <Label for={`setting-${def.id}`}>{def.label}</Label>
            <p class="text-xs text-muted-foreground">{def.description}</p>
          </div>
          <Switch
            id={`setting-${def.id}`}
            checked={settings.get(def.id)}
            onCheckedChange={(checked) => settings.set(def.id, checked)}
          />
        </div>
      {/each}
    </Popover.Content>
  </Popover.Root>
</Sidebar.MenuItem>
