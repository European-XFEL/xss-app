import type { Molecule } from '$lib/molecule';

import type { listSolvents } from './solvent.remote';

export type Solvents = Awaited<ReturnType<typeof listSolvents>>;

export type Solvent = Solvents[number];

export interface Sample {
  concentrationSoluteMolar: number | null;
  solvent: Solvent | null;
  ground: Molecule | null;
  excited: Molecule | null;
}
