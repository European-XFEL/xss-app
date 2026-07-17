import { expect, test } from './fixtures';
import {
  DSS_SERIES_TOKENS,
  metricValue,
  selectTrigger,
  seriesPath,
  waitUntilInteractive,
} from './helpers';

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

  // Every ΔS series actually drew its own line — not just the legend, which
  // renders all 4 items unconditionally, and not just "some" path, which the
  // two solvent curves alone would already satisfy while Total/Solute stayed
  // broken. See seriesPath's doc comment for why the stroke token proves it.
  // Each check retries for a few seconds, which also gives a fetch failure
  // (below) time to have surfaced by the time we check for it — ΔT settles
  // independently of the solute/solvent fetches (it's a separate thermo
  // calc), so checking the banner immediately after it would race the error.
  for (const token of DSS_SERIES_TOKENS) {
    const path = seriesPath(page, token);
    await expect(path).toBeVisible();
    expect((await path.getAttribute('d'))?.length ?? 0).toBeGreaterThan(100);
  }

  // No compute-error banner (+page.svelte's fetchError alert) once compute
  // settles — this fires on a worker/fetch failure, e.g. the solute Debye
  // compute's DataCloneError (bd initial-dev-zct) that this suite used to
  // miss entirely.
  await expect(page.getByRole('alert')).toHaveCount(0);
});
