import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/**
 * Locate a shadcn `Field.Field` wrapper (`data-slot="field"`, see
 * src/lib/shadcn/components/ui/field/field.svelte) by its visible label
 * text, then the input/textarea control inside it.
 *
 * The molecule form's labels and controls are siblings (`Field.Label` /
 * `Field.FieldLabel` next to `Field.Content > Input`), not a wrapping
 * `<label>` and no `for`/`aria-labelledby` links them — so `getByLabel`
 * doesn't resolve here. `data-slot` is this app's existing, stable styling
 * hook (used the same way across every shadcn component), not a
 * test-only attribute, so anchoring to it is no more brittle than any
 * other structural locator.
 */
export function fieldControl(scope: Page | Locator, label: string) {
  return scope
    .locator('[data-slot="field"]', { hasText: label })
    .locator('input, textarea')
    .first();
}

/**
 * Locate a bits-ui `Select.Trigger` (`data-slot="select-trigger"`) by its
 * current visible text (the placeholder, or the selected value once one is
 * chosen). Same rationale as `fieldControl`: the trigger has no wired
 * accessible name, so this anchors to the existing `data-slot` convention.
 */
export function selectTrigger(scope: Page | Locator, currentText: string) {
  return scope.locator('[data-slot="select-trigger"]', {
    hasText: currentText,
  });
}

/**
 * The value cell of a ResultsPane stat (ΔT, Deposited Energy, Q range) —
 * label and value are sibling divs under one wrapper (ResultsPane.svelte),
 * not associated by ARIA, so this walks to the next sibling instead.
 */
export function metricValue(scope: Page, label: string): Locator {
  return scope
    .getByText(label, { exact: true })
    .locator('xpath=following-sibling::div[1]');
}

/**
 * Wait until the page is genuinely interactive, not just rendered.
 *
 * Every Playwright test gets a fresh, cache-less browser context, so the
 * dev server (Vite, unbundled) serves several hundred uncompiled ES modules
 * on each test's first navigation — this app's whole component tree, one
 * request per `.svelte`/`.ts` file. `load`/`networkidle` fire once those
 * requests settle, but Svelte's hydration (which is what actually wires up
 * `onclick`/pointerdown handlers) can finish noticeably later, especially
 * under a shared/throttled CPU. A click issued in that window is a silent
 * no-op — the browser still moves native focus, so nothing throws — which
 * looks exactly like "the app is broken" without this wait.
 *
 * Retries a real, cheap interaction (opening the Settings popover, present
 * on every `(app)` route) instead of a fixed sleep, so this adapts to
 * whatever the environment actually needs and fails loudly (via `toPass`'s
 * timeout) if the app is genuinely stuck rather than just slow to hydrate.
 */
export async function waitUntilInteractive(page: Page): Promise<void> {
  await expect(async () => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('switch').first()).toBeVisible({
      timeout: 1000,
    });
  }).toPass({ timeout: 30_000 });
  await page.keyboard.press('Escape');
}

/**
 * A tiny, unique-per-call .xyz fixture for the upload flow: both the
 * filename and the file contents (via the embedded id, which changes the
 * sha) are unique, so a prior run's leftover row (e.g. from a failed
 * cleanup) can never collide with this one on the `moleculeFiles.sha`
 * unique constraint or be mistaken for it by filename.
 */
export function writeUniqueFixture(): { path: string; filename: string } {
  const id = randomUUID().slice(0, 8);
  const filename = `e2e-test-${id}.xyz`;
  const dir = mkdtempSync(join(tmpdir(), 'xss-e2e-'));
  const path = join(dir, filename);
  writeFileSync(
    path,
    `2\n# E2E fixture ${id} — not real molecular data\nH 0.000000 0.000000 0.000000\nH 0.000000 0.000000 0.740000\n`,
  );
  return { path, filename };
}
