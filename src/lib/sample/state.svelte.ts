import type { Molecule } from '$lib/molecule';

import type { Sample, Solvent } from './types';

export interface SampleStateInit {
  concentrationSoluteMolar?: number | null;
  solvent?: Solvent | null;
  ground?: Molecule | null;
  excited?: Molecule | null;
}

export class SampleState implements Sample {
  // Non-null default so ΔT/deposited energy read out immediately instead of
  // N/A; 1 mmol/L is a typical TR-XSS solute concentration.
  concentrationSoluteMolar: number | null = $state(0.001);
  solvent: Solvent | null = $state(null);
  ground: Molecule | null = $state(null);
  excited: Molecule | null = $state(null);

  constructor(init?: SampleStateInit) {
    if (init?.concentrationSoluteMolar !== undefined) {
      this.concentrationSoluteMolar = init.concentrationSoluteMolar;
    }
    if (init?.solvent !== undefined) this.solvent = init.solvent;
    if (init?.ground !== undefined) this.ground = init.ground;
    if (init?.excited !== undefined) this.excited = init.excited;
  }

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
