import type { Molecule } from '$lib/molecule';

import type { Sample, Solvent } from './types';

export class SampleState implements Sample {
  concentrationSoluteMolar: number | null = $state(null);
  solvent: Solvent | null = $state(null);
  ground: Molecule | null = $state(null);
  excited: Molecule | null = $state(null);

  /** Toggle a molecule as the ground selection; clears it from excited. */
  toggleGround(molecule: Molecule): void {
    if (this.ground?.id === molecule.id) {
      this.ground = null;
      return;
    }
    this.ground = molecule;
    if (this.excited?.id === molecule.id) this.excited = null;
  }

  /** Toggle a molecule as the excited selection; clears it from ground. */
  toggleExcited(molecule: Molecule): void {
    if (this.excited?.id === molecule.id) {
      this.excited = null;
      return;
    }
    this.excited = molecule;
    if (this.ground?.id === molecule.id) this.ground = null;
  }

  /** Assign a group's molecules to ground/excited by their state flag. */
  selectGroup(molecules: Molecule[]): void {
    for (const molecule of molecules) {
      if (molecule.state === 0) {
        this.ground = molecule;
      } else if (molecule.state === 1) {
        this.excited = molecule;
      }
    }
  }
}
