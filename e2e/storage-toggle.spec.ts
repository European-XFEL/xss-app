import { E2E_DB_NAME, connect } from './db';
import { expect, test } from './fixtures';
import {
  fieldControl,
  selectStructures,
  storedMoleculeFilenames,
  waitUntilInteractive,
  writeUniqueFixture,
} from './helpers';

test('client-storage toggle routes uploads to IndexedDB, not Postgres', async ({
  page,
}) => {
  await page.goto('/experiment/samples');
  await waitUntilInteractive(page);

  // Flip the backendless-storage toggle; it takes effect on reload (see the
  // setting's own description in settings.svelte.ts).
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Backendless (local) storage').click();
  await page.reload();
  await waitUntilInteractive(page);

  const ground = writeUniqueFixture();
  const excited = writeUniqueFixture();
  const { filename } = ground;
  const sql = connect(E2E_DB_NAME);
  try {
    const [{ count: before }] = await sql<{ count: number }[]>`
      SELECT count(*)::int FROM "moleculeFiles" WHERE "readOnly" = false
    `;

    await page.getByRole('button', { name: 'Add molecule' }).click();
    const dialog = page.getByRole('dialog', { name: 'Upload Molecule' });
    await selectStructures(dialog, [ground.path, excited.path]);
    await fieldControl(dialog, 'Description').fill(
      'E2E client-storage test fixture',
    );
    // Client-storage mode skips the no-auth ack modal entirely (nothing
    // leaves the browser — see requireUploadAck in MoleculeFormDialog.svelte).
    await dialog.getByRole('button', { name: 'Upload' }).click();
    await expect(dialog).toBeHidden();

    // Lands in the browser's IndexedDB...
    await expect(page.getByRole('row', { name: filename })).toBeVisible();
    const filenames = await storedMoleculeFilenames(page);
    expect(filenames).toContain(filename);

    // ...and never reaches the shared Postgres database.
    const [{ count: after }] = await sql<{ count: number }[]>`
      SELECT count(*)::int FROM "moleculeFiles" WHERE "readOnly" = false
    `;
    expect(after).toBe(before);
    const serverRows = await sql`
      SELECT 1 FROM "moleculeFiles" WHERE filename = ${filename}
    `;
    expect(serverRows.length).toBe(0);
  } finally {
    await sql.end();
  }
});
