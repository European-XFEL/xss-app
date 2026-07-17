/**
 * Static-artifact smoke suite (run via `pnpm e2e:static`): the prerendered
 * adapter-static build served by Caddy under the /xss-app base path. No
 * database exists in this target — everything is baked in at build time and
 * uploads always go to the browser's IndexedDB.
 *
 * NOTE: gotos here are relative ('dashboard', no leading slash) so they
 * resolve under the /xss-app base path — see playwright.static.config.ts.
 */
import { expect, test } from './fixtures';
import {
  fieldControl,
  metricValue,
  selectTrigger,
  storedMoleculeFilenames,
  waitUntilInteractive,
  writeUniqueFixture,
} from './helpers';

test('boots under the base path and computes ΔS(Q) client-side', async ({
  page,
}) => {
  // Watchdog: the static target must never reach for a local backend — the
  // node dev server (4173/5173+), Postgres-backed remote functions, anything
  // not the Caddy origin. Scoped to localhost on purpose: the artifact under
  // test is the real deploy artifact, and it legitimately posts Sentry
  // telemetry to its remote ingest host — that's not a backend escape.
  const escapedRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    const isLocal = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (isLocal && url.port !== '8080') {
      escapedRequests.push(request.url());
    }
  });

  await page.goto('dashboard');
  expect(page.url()).toContain('/xss-app/');
  await waitUntilInteractive(page);

  await selectTrigger(page, 'Select a solvent').click();
  await page.getByRole('option', { name: 'Cyclohexane' }).click();
  await selectTrigger(page, 'Select molecule').click();
  await page.getByRole('option', { name: 'PtPOP' }).click();

  // Real client-side Debye compute in the Web Worker, same as the node
  // suite: ΔT replaces its placeholder only when the worker finishes.
  await expect(metricValue(page, 'ΔT')).not.toContainText('—', {
    timeout: 30_000,
  });
  const plotPath = page.locator('svg path').first();
  await expect(plotPath).toBeVisible();
  expect((await plotPath.getAttribute('d'))?.length ?? 0).toBeGreaterThan(0);

  expect(escapedRequests).toEqual([]);
});

test('molecule upload lands in IndexedDB', async ({ page }) => {
  const { path, filename } = writeUniqueFixture();

  await page.goto('experiment/samples');
  await waitUntilInteractive(page);

  await page.getByRole('button', { name: 'Add molecule' }).click();
  const dialog = page.getByRole('dialog', { name: 'Upload Molecule File' });
  await fieldControl(dialog, 'Select File').setInputFiles(path);
  await expect(fieldControl(dialog, 'Atom Count')).toHaveValue('2');
  await fieldControl(dialog, 'Description').fill('E2E static smoke fixture');
  // Static build is always client storage, so the no-auth ack modal never
  // appears (requireUploadAck in MoleculeFormDialog.svelte).
  await dialog.getByRole('button', { name: 'Upload' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('row', { name: filename })).toBeVisible();
  expect(await storedMoleculeFilenames(page)).toContain(filename);
});
