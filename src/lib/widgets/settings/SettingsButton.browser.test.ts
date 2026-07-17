import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';

import SidebarProvider from '$lib/shadcn/components/ui/sidebar/sidebar-provider.svelte';

import SettingsButton from './SettingsButton.svelte';

// Guards the regression fixed in c12be8d: the popover's "seen" gate used to
// require EVERY entry in SETTINGS_SCHEMA to have a cookie before treating the
// popover as seen — but `uploadAcknowledged` is only ever set from the upload
// flow, never from the popover, so merely opening and closing the popover
// wrote no cookie at all and it force-auto-opened again on every page load.
// The fix tracks "seen" with a dedicated settings.seen cookie written on
// first close. If that regresses, the second mount below auto-opens again
// (trigger aria-expanded stays "true") and the final assertion fails.
test('closing the popover once stops it auto-opening on later mounts', async () => {
  // Deterministic first-visit state regardless of what earlier runs left.
  document.cookie = 'settings.seen=; path=/; max-age=0';

  const first = await render(SettingsButton, {}, { wrapper: SidebarProvider });

  // First visit: the popover auto-opens.
  await expect
    .element(first.getByText('Session Replay', { exact: true }))
    .toBeVisible();

  // Close it WITHOUT toggling any individual setting — exactly the user
  // action that pre-fix left no cookie behind.
  await userEvent.keyboard('{Escape}');
  await expect
    .element(first.getByText('Session Replay', { exact: true }))
    .not.toBeInTheDocument();
  await first.unmount();

  // Fresh mount, same browser state = next page load.
  const second = await render(SettingsButton, {}, { wrapper: SidebarProvider });
  await expect
    .element(second.getByRole('button', { name: 'Settings' }))
    .toHaveAttribute('aria-expanded', 'false');
});
