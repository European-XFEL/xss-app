import { describe, expect, it } from 'vitest';

import { formatSigFigs } from './format';

describe('formatSigFigs', () => {
  it('rounds to 3 significant figures by default', () => {
    expect(formatSigFigs(8.498164)).toBe('8.5');
    expect(formatSigFigs(0.005253)).toBe('0.00525');
    expect(formatSigFigs(0.006044)).toBe('0.00604');
  });

  it('strips trailing zeros introduced by toPrecision', () => {
    expect(formatSigFigs(8.5)).toBe('8.5');
    expect(formatSigFigs(100)).toBe('100');
  });

  it('supports a custom significant-figure count', () => {
    expect(formatSigFigs(55000, 5)).toBe('55000');
    expect(formatSigFigs(0.005253, 5)).toBe('0.005253');
  });

  it('renders zero as a bare 0', () => {
    expect(formatSigFigs(0)).toBe('0');
    expect(formatSigFigs(-0)).toBe('0');
  });

  it('stays in fixed notation for mid-range magnitudes', () => {
    expect(formatSigFigs(0.0000123)).toBe('0.0000123');
    expect(formatSigFigs(123456)).toBe('123000');
  });

  it('falls back to exponential notation only for extreme magnitudes', () => {
    expect(formatSigFigs(1.23456e-19)).toBe('1.23e-19');
    expect(formatSigFigs(1.23456e21)).toBe('1.23e+21');
  });

  it('handles negative values', () => {
    expect(formatSigFigs(-8.498164)).toBe('-8.5');
  });

  it('formats null/undefined/non-finite values as an em dash', () => {
    expect(formatSigFigs(null)).toBe('—');
    expect(formatSigFigs(undefined)).toBe('—');
    expect(formatSigFigs(Number.NaN)).toBe('—');
    expect(formatSigFigs(Number.POSITIVE_INFINITY)).toBe('—');
  });
});
