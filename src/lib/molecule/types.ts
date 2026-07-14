import type { MoleculeInfo } from '$lib/shared/contracts';

export type Molecules = MoleculeInfo[];

export type Molecule = MoleculeInfo;

export type MoleculeSelection = {
  ground: Molecule | null;
  excited: Molecule | null;
};

export function formatState(state: number): string {
  if (state === 0) return 'Ground (S\u2080)';
  if (state === 1) return 'Excited (S\u2081)';
  return `State ${state}`;
}
