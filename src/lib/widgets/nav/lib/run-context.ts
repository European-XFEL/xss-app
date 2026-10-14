/**
 * Shared shape + derivations for the run context shown in the command bar
 * and the status bar. Both widgets receive this via a `sample` prop derived
 * from `useSimulationState()` in `+layout.svelte` — the widgets layer
 * cannot import `$lib/app` directly (see the eslint boundaries rule).
 */
export interface NavSample {
  moleculeName: string | undefined | null;
  groundName: string | undefined | null;
  excitedName: string | undefined | null;
  solventName: string | undefined | null;
  concentrationSoluteMmol: number | undefined | null;
  /** True while the simulation is being recomputed. */
  computing?: boolean;
  /** True when the last scattering fetch/compute failed. */
  computeError?: boolean;
}

/** Strips a file extension, e.g. "LS.xyz" -> "LS". */
function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

export function isSetupComplete(sample: NavSample): boolean {
  return !!sample.groundName && !!sample.excitedName && !!sample.solventName;
}

/**
 * Builds a run title like "FeBpy3: LS → HS in DCM" from the sample state,
 * falling back to "Untitled run" when the setup is incomplete.
 */
export function getRunTitle(sample: NavSample): string {
  if (
    !sample.moleculeName ||
    !sample.groundName ||
    !sample.excitedName ||
    !sample.solventName
  ) {
    return 'Untitled run';
  }

  const ground = stripExtension(sample.groundName);
  const excited = stripExtension(sample.excitedName);
  return `${sample.moleculeName}: ${ground} → ${excited} in ${sample.solventName}`;
}
