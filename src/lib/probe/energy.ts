/** hc in keV·Å: E[keV] = HC_KEV_ANGSTROM / wavelength[Å]. */
export const HC_KEV_ANGSTROM = 12.398;

// The wavelength is the single stored value (and what the URL serializes);
// keV is a derived view, so the conversion is its own inverse.
export const wavelengthToKev = (wavelengthAngstrom: number) =>
  HC_KEV_ANGSTROM / wavelengthAngstrom;
export const kevToWavelength = (kev: number) => HC_KEV_ANGSTROM / kev;
