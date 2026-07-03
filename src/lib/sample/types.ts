import type { Molecule } from '$lib/molecule';
import type { listSolvents } from '$lib/shared/api/api';

export type Solvents = Awaited<ReturnType<typeof listSolvents>>;

export type Solvent = Solvents[number];

export interface Sample {
  concentrationSoluteMolar: number | null;
  solvent: Solvent | null;
  ground: Molecule | null;
  excited: Molecule | null;
}
