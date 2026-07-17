import { expect, test } from './fixtures';
import {
  fieldControl,
  waitUntilInteractive,
  writeUniqueFixture,
} from './helpers';

test.describe('molecule upload / edit / delete', () => {
  test('upload, edit, then delete a structure file', async ({ page }) => {
    const { path, filename } = writeUniqueFixture();

    await page.goto('/experiment/samples');
    await waitUntilInteractive(page);
    await page.getByRole('button', { name: 'Add molecule' }).click();

    const uploadDialog = page.getByRole('dialog', {
      name: 'Upload Molecule File',
    });
    await fieldControl(uploadDialog, 'Select File').setInputFiles(path);
    // Atom count is read asynchronously from the file's first line — wait
    // for the real value rather than an arbitrary sleep.
    await expect(fieldControl(uploadDialog, 'Atom Count')).toHaveValue('2');
    await fieldControl(uploadDialog, 'Description').fill(
      'E2E upload test fixture',
    );
    await uploadDialog.getByRole('button', { name: 'Upload' }).click();

    // First upload in a fresh browser context hits the no-auth ack modal.
    const ack = page.getByRole('dialog', {
      name: 'This app has no authentication',
    });
    if (await ack.isVisible().catch(() => false)) {
      await ack
        .getByRole('button', { name: 'I understand, upload anyway' })
        .click();
    }

    await expect(uploadDialog).toBeHidden();
    const row = page.getByRole('row', { name: filename });
    await expect(row).toBeVisible();

    // Edit: change the description via the file's own edit dialog.
    await row.getByRole('button', { name: 'Edit structure file' }).click();
    const editDialog = page.getByRole('dialog', { name: filename });
    await expect(editDialog).toBeVisible();
    await fieldControl(editDialog, 'Description').fill(
      'E2E upload test fixture — edited',
    );
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(editDialog).toBeHidden();
    await expect(row).toContainText('edited');

    // Delete: reopen the edit dialog and confirm the destructive action.
    await row.getByRole('button', { name: 'Edit structure file' }).click();
    await expect(editDialog).toBeVisible();
    await editDialog.getByRole('button', { name: 'Delete file' }).click();
    const confirmDialog = page.getByRole('dialog', {
      name: 'Delete structure file?',
    });
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(confirmDialog).toBeHidden();
    await expect(page.getByRole('row', { name: filename })).toHaveCount(0);
  });

  test('a read-only seeded molecule refuses edits', async ({ page }) => {
    await page.goto('/experiment/samples');
    await waitUntilInteractive(page);

    // The group header row (not the per-file sub-rows, which also match
    // "PtPOP" via their filenames) — it's the one with "Edit molecule".
    const row = page.getByRole('row', { name: 'PtPOP' }).first();
    await row.getByRole('button', { name: 'Edit molecule' }).click();

    const dialog = page.getByRole('dialog', { name: 'PtPOP' });
    await expect(dialog.getByText('This molecule is read-only.')).toBeVisible();
    await expect(fieldControl(dialog, 'Molecule Name')).toBeDisabled();
    await expect(
      dialog.getByRole('button', { name: 'Delete molecule' }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole('button', { name: 'Save changes' }),
    ).toBeDisabled();

    // Closing (not cancelling) confirms nothing was submitted. Scoped to the
    // dialog's footer: `Dialog.Content` also renders its own auto corner "X"
    // button with the same accessible name ("Close"), see dialog-content.svelte.
    await dialog
      .locator('[data-slot="dialog-footer"]')
      .getByRole('button', { name: 'Close' })
      .click();
    await expect(dialog).toBeHidden();
    await expect(row).toBeVisible();
  });
});
