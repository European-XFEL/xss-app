import {
  computeConcentrationExcited,
  computeConcentrationSolvent,
  computeDeltaEJ,
  computeDeltaEeV,
  computeDeltaT,
  computeRatioSolventSolute,
  isPumpEnergyPhysical,
  normalizeExcitedStateFraction,
} from './math';

export type ScatteringMathSources = {
  concentrationSoluteMmol: () => number | null | undefined;
  excitedStateFraction: () => number | null | undefined;
  photonEnergyEv: () => number | null | undefined;
  excitedStateEnergyEv: () => number | null | undefined;
  solventRhom: () => number | null | undefined;
  solventCpm: () => number | null | undefined;
};

export class ScatteringMathState {
  readonly concentrationSolvent = $derived.by(() =>
    computeConcentrationSolvent(this.sources.solventRhom()),
  );

  /**
   * When the photon energy is below the excited-state energy no excited
   * state can form, so the effective excited fraction (and everything
   * derived from it) is forced to zero.
   */
  readonly pumpEnergyPhysical = $derived.by(() =>
    isPumpEnergyPhysical(
      this.sources.photonEnergyEv(),
      this.sources.excitedStateEnergyEv(),
    ),
  );

  readonly concentrationExcited = $derived.by(() =>
    computeConcentrationExcited(
      this.sources.concentrationSoluteMmol(),
      this.pumpEnergyPhysical ? this.sources.excitedStateFraction() : 0,
    ),
  );

  readonly ratioSolventSolute = $derived.by(() =>
    computeRatioSolventSolute(
      this.concentrationSolvent,
      this.sources.concentrationSoluteMmol(),
    ),
  );

  readonly deltaEeV = $derived.by(() =>
    computeDeltaEeV(
      this.sources.photonEnergyEv(),
      this.sources.excitedStateEnergyEv(),
    ),
  );

  readonly deltaEJ = $derived.by(() => computeDeltaEJ(this.deltaEeV));

  readonly deltaT = $derived.by(() =>
    computeDeltaT(
      this.concentrationExcited,
      this.concentrationSolvent,
      this.deltaEJ,
      this.sources.solventCpm(),
    ),
  );

  readonly excitedStateFraction = $derived.by(() =>
    this.pumpEnergyPhysical
      ? normalizeExcitedStateFraction(this.sources.excitedStateFraction())
      : 0,
  );

  constructor(private readonly sources: ScatteringMathSources) {}
}
