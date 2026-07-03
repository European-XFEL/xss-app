import { describe, expect, it } from 'vitest';

import { DetectorState } from './state.svelte';

describe('DetectorState', () => {
  it('builds the default LPD detector with four modules', () => {
    const state = new DetectorState('LPD', 1.5);

    expect(state.name).toBe('LPD');
    expect(state.pixelSize).toBeCloseTo(0.172);
    expect(state.modules).toHaveLength(4);
    expect(state.distance).toBe(100);
  });

  it('throws for an unknown detector name', () => {
    expect(() => new DetectorState('UNKNOWN' as never, 1.5)).toThrow(
      /not found/,
    );
  });

  it('derives imageShape from the module geometry', () => {
    const state = new DetectorState('LPD', 1.5);

    expect(state.imageShape.width).toBeGreaterThan(0);
    expect(state.imageShape.height).toBeGreaterThan(0);
  });

  it('re-derives qRange and radiusRange when distance changes', () => {
    const state = new DetectorState('LPD', 1.5);

    const initialQRange = state.qRange;
    state.distance = 200;

    expect(state.qRange).not.toEqual(initialQRange);
    expect(state.radiusRange).toEqual({
      min: state.qRange.rMinPx,
      max: state.qRange.rMaxPx,
    });
  });

  it('setDetector resets modules for the given name', () => {
    const state = new DetectorState('LPD', 1.5);
    const originalModules = state.modules;

    state.setDetector('LPD');

    expect(state.modules).not.toBe(originalModules);
    expect(state.modules).toHaveLength(4);
  });
});
