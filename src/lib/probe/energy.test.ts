import { describe, expect, it } from 'vitest';

import { kevToWavelength, wavelengthToKev } from './energy';

describe('probe energy conversion', () => {
  it('round-trips wavelength through keV', () => {
    expect(kevToWavelength(wavelengthToKev(1.54))).toBeCloseTo(1.54, 12);
  });

  it('converts 12.398 keV to 1 Å', () => {
    expect(kevToWavelength(12.398)).toBeCloseTo(1, 12);
  });
});
