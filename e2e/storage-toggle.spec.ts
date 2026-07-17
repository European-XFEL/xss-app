import type { Page } from '@playwright/test';

import { E2E_DB_NAME, connect } from './db';
import { expect, test } from './fixtures';
import {
  fieldControl,
  waitUntilInteractive,
  writeUniqueFixture,
} from './helpers';

/** Read uploaded molecules' filenames straight out of idb-keyval's default
 * IndexedDB (`keyval-store` / `keyval`, see `$lib/shared/molecule-store.ts`)
 * — the same store the app itself reads/writes in client-storage mode. */
async function storedMoleculeFilenames(page: Page): Promise<string[]> {
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

  const { path, filename } = writeUniqueFixture();
  const sql = connect(E2E_DB_NAME);
  try {
    const [{ count: before }] = await sql<{ count: number }[]>`
      SELECT count(*)::int FROM "moleculeFiles" WHERE "readOnly" = false
    `;

    await page.getByRole('button', { name: 'Add molecule' }).click();
    const dialog = page.getByRole('dialog', { name: 'Upload Molecule File' });
    await fieldControl(dialog, 'Select File').setInputFiles(path);
    await expect(fieldControl(dialog, 'Atom Count')).toHaveValue('2');
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
