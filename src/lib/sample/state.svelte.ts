import type { Molecule } from '$lib/molecule';

import type { Sample, Solvent } from './types';

export class SampleState implements Sample {
  concentrationSoluteMolar: number | null = $state(null);
  solvent: Solvent | null = $state(null);
  ground: Molecule | null = $state(null);
  excited: Molecule | null = $state(null);
}
