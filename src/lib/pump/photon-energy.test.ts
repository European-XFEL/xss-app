import { describe, expect, it } from 'vitest';

import { photonEnergyFloorEv } from './photon-energy';

describe('photonEnergyFloorEv', () => {
  it('never lets the photon slider minimum fall below the excited-state energy', () => {
    expect(photonEnergyFloorEv(2)).toBe(2);
    expect(photonEnergyFloorEv(0.1)).toBe(1);
  });

  it('stays within the slider maximum', () => {
    expect(photonEnergyFloorEv(9)).toBe(5);
  });
});
