export const PHOTON_ENERGY_MIN_EV = 1.0;
export const PHOTON_ENERGY_MAX_EV = 5.0;

/**
 * Lowest photon energy the slider offers. A photon below the excited-state
 * energy is unphysical (the simulation zeroes the excited fraction, so every
 * curve flattens and the warning shows), so the slider's minimum follows the
 * excited-state energy instead of letting a drag land in that dead zone.
 */
export function photonEnergyFloorEv(excitedStateEnergyEv: number): number {
  return Math.min(
    PHOTON_ENERGY_MAX_EV,
    Math.max(PHOTON_ENERGY_MIN_EV, excitedStateEnergyEv),
  );
}
