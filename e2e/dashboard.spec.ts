import { expect, test } from './fixtures';
import { metricValue, selectTrigger, waitUntilInteractive } from './helpers';

test('dashboard simulation loop computes and renders ΔS(Q)', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await waitUntilInteractive(page);

  // Configure a sample: solvent + a molecule with both ground/excited states
  // seeded (PtPOP) — selecting the molecule auto-resolves both states (see
  // MoleculeFields.svelte's onMoleculeChange), so no separate ground/excited
  // pick is needed to complete the setup.
  await selectTrigger(page, 'Select a solvent').click();
  await page.getByRole('option', { name: 'Cyclohexane' }).click();

  await selectTrigger(page, 'Select molecule').click();
  await page.getByRole('option', { name: 'PtPOP' }).click();

  // ΔT renders as the "—" placeholder until the Web Worker (debye.worker.ts)
  // finishes the real Debye computation; wait for that real value instead of
  // a fixed sleep — this is what actually proves the compute ran.
  await expect(metricValue(page, 'ΔT')).not.toContainText('—', {
    timeout: 30_000,
  });

  // The plot itself: a drawn line (non-empty SVG path) for a computed series.
  const plotPath = page.locator('svg path').first();
  await expect(plotPath).toBeVisible();
  const d = await plotPath.getAttribute('d');
  expect(d?.length ?? 0).toBeGreaterThan(0);
});
