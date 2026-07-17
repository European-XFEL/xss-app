import { test as base } from '@playwright/test';

/**
 * Every flow spec drives a fresh, cookie-less browser context, which trips
 * the app's real first-visit behavior: SettingsButton.svelte auto-opens the
 * Settings popover until `settings.seen` is set (see hasSeenSettings /
 * markSettingsSeen in settings.svelte.ts). That's legitimate UX, but it's
 * not what any of these flows are testing, and the popover competes for
 * clicks with the Select comboboxes these specs drive. Seed the same
 * cookie a real visitor gets after dismissing it once, so every spec starts
 * from a "returning visitor" state instead of incidentally re-testing the
 * first-visit tour.
 */
export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    await context.addCookies([
      { name: 'settings.seen', value: 'true', url: baseURL },
    ]);
    await use(context);
  },
});

export { expect } from '@playwright/test';
