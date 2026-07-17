import { expect, test } from './fixtures';
import { metricValue, selectTrigger, waitUntilInteractive } from './helpers';

test('share link round-trip restores the simulation setup', async ({
  page,
  browser,
}) => {
  await page.goto('/dashboard');
  await waitUntilInteractive(page);

  await selectTrigger(page, 'Select a solvent').click();
  await page.getByRole('option', { name: 'Cyclohexane' }).click();
  await selectTrigger(page, 'Select molecule').click();
  await page.getByRole('option', { name: 'PtPOP' }).click();

  // Wait for the setup to be complete (READY) before sharing, else the link
  // would encode a partial setup.
  await expect(page.getByText('READY', { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  // Capture what the Share button copies without depending on OS clipboard
  // permissions/integration in headless Chromium. The click still runs the
  // real handler (serializeSimulationParams + navigator.clipboard.writeText,
  // see (app)/+layout.svelte's handleShare) — only the final OS write is
  // captured here instead of read back from the OS clipboard.
  await page.evaluate(() => {
    (window as unknown as { __copiedText: string | null }).__copiedText = null;
    navigator.clipboard.writeText = async (text: string) => {
      (window as unknown as { __copiedText: string | null }).__copiedText =
        text;
    };
  });
  await page.getByRole('button', { name: 'Share' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __copiedText: string | null }).__copiedText,
      ),
    )
    .not.toBeNull();
  const shareUrl = await page.evaluate(
    () => (window as unknown as { __copiedText: string | null }).__copiedText!,
  );
  expect(shareUrl).toContain('?s=');

  // Fresh browser context: no cookies, no client-side state left over — the
  // restore below can only come from the URL itself. `settings.seen` is
  // seeded only to suppress the first-visit Settings popover (see
  // e2e/fixtures.ts); it plays no part in the restore being tested.
  const freshContext = await browser.newContext();
  await freshContext.addCookies([
    { name: 'settings.seen', value: 'true', url: new URL(shareUrl).origin },
  ]);
  try {
    const freshPage = await freshContext.newPage();
    await freshPage.goto(shareUrl);
    await waitUntilInteractive(freshPage);

    await expect(selectTrigger(freshPage, 'Cyclohexane')).toBeVisible();
    // Strongest proof of a full restore: ΔT only populates once ground,
    // excited, and solvent are ALL resolved and the Web Worker recomputes —
    // with zero reselection here, this can only come from the URL.
    await expect(metricValue(freshPage, 'ΔT')).not.toContainText('—', {
      timeout: 30_000,
    });
  } finally {
    await freshContext.close();
  }
});
