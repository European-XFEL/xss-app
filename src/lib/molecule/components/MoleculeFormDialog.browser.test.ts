import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import type { MoleculeInfo } from '$lib/shared/contracts';

import MoleculeFormDialog from './MoleculeFormDialog.svelte';

function file(overrides: Partial<MoleculeInfo>): MoleculeInfo {
  return {
    id: 'a'.repeat(24),
    filename: 'water-gs.xyz',
    sha: 'sha',
    moleculeName: 'Water',
    description: '',
    state: 0,
    reference: null,
    atomCount: 3,
    readOnly: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: undefined,
    ...overrides,
  };
}

// Guards the read-only contract unified in d9fd319: in edit-molecule mode the
// dialog must treat the WHOLE molecule as read-only when ANY of its structure
// files is read-only (`groupFiles.some(...)`), mirroring the server's
// checkMoleculeEditable which rejects molecule-level mutations in that case.
// The tempting "fix" to `.every(...)` (or checking only one file) would offer
// Save/Delete for a mixed group and every submit would bounce off the server.
test('edit-molecule mode is read-only when any group file is read-only', async () => {
  const screen = await render(MoleculeFormDialog, {
    open: true,
    intent: { mode: 'edit-molecule', moleculeName: 'Water', atomCount: 3 },
    molecules: [
      file({ id: 'a'.repeat(24), filename: 'water-gs.xyz', readOnly: true }),
      file({ id: 'b'.repeat(24), filename: 'water-es.xyz', readOnly: false }),
    ],
  });

  await expect
    .element(screen.getByText('This molecule is read-only.'))
    .toBeVisible();
  await expect
    .element(screen.getByRole('button', { name: 'Save changes' }))
    .toBeDisabled();
  await expect
    .element(screen.getByRole('button', { name: 'Delete molecule' }))
    .toBeDisabled();
  await expect.element(screen.getByRole('textbox')).toBeDisabled();
});
