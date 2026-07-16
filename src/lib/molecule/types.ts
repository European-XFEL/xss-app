import type { MoleculeInfo } from '$lib/shared/contracts';

export type Molecules = MoleculeInfo[];

export type Molecule = MoleculeInfo;

export type MoleculeSelection = {
  ground: Molecule | null;
  excited: Molecule | null;
};

/**
 * What the shared molecule form dialog (MoleculeFormDialog) is being opened
 * for: creating a structure file (optionally preset to an existing molecule),
 * editing one structure file, or editing a molecule's shared header fields.
 */
export type MoleculeDialogIntent =
  | { mode: 'create'; moleculeName?: string }
  | { mode: 'edit-file'; molecule: Molecule }
  | { mode: 'edit-molecule'; moleculeName: string; atomCount: number };
