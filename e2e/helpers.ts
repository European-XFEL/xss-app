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
 * The DSSPlot's four ΔS series, keyed by the CSS custom property
 * DSSPlot.svelte assigns each series' `line_style.stroke` (`--data-total` /
 * `--data-solute` / `--data-solvent` / `--data-permol` — the app's own design
 * tokens, see src/app.css). matterviz's ScatterPlot only draws a `<path>`
 * for a series that actually has data: the legend's 4 items render
 * unconditionally regardless, so a broken solute compute (bd
 * initial-dev-zct — the worker threw DataCloneError, only the two solvent
 * curves plotted) still shows a full legend and a non-empty first `<path>`.
 * Checking each series' own stroke-tagged path is what actually proves its
 * data reached the DOM.
 */
export const DSS_SERIES_TOKENS = [
  'total',
  'solute',
  'solvent',
  'permol',
] as const;

export function seriesPath(
  page: Page,
  token: (typeof DSS_SERIES_TOKENS)[number],
): Locator {
  return page.locator(`svg path[stroke="var(--data-${token})"]`);
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

/** Read uploaded molecules' filenames straight out of idb-keyval's default
 * IndexedDB (`keyval-store` / `keyval`, see `$lib/shared/molecule-store.ts`)
 * — the same store the app itself reads/writes in client-storage mode. */
export async function storedMoleculeFilenames(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('keyval')) {
            resolve([]);
            return;
          }
          const store = db
            .transaction('keyval', 'readonly')
            .objectStore('keyval');
          const keysReq = store.getAllKeys();
          keysReq.onerror = () => reject(keysReq.error);
          keysReq.onsuccess = () => {
            const molKeys = (keysReq.result as string[]).filter((k) =>
              k.startsWith('mol:'),
            );
            if (molKeys.length === 0) {
              resolve([]);
              return;
            }
            const names: string[] = [];
            let remaining = molKeys.length;
            const done = () => {
              if (--remaining === 0) resolve(names);
            };
            for (const key of molKeys) {
              const getReq = store.get(key);
              getReq.onsuccess = () => {
                if (getReq.result?.filename) names.push(getReq.result.filename);
                done();
              };
              getReq.onerror = done;
            }
          };
        };
      }),
  );
}
