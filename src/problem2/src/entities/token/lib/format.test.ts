import { describe, it, expect } from 'vitest';
import { formatTokenAmount, formatUsd } from './format';

describe('formatTokenAmount', () => {
  it('returns "0" for zero', () => {
    expect(formatTokenAmount(0)).toBe('0');
  });

  it('returns em-dash for non-finite input', () => {
    expect(formatTokenAmount(Number.NaN)).toBe('—');
    expect(formatTokenAmount(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('formats values >= 1 with up to 4 fractional digits', () => {
    expect(formatTokenAmount(1234.5678)).toBe('1,234.5678');
    expect(formatTokenAmount(42)).toBe('42');
  });

  it('uses compact notation past one million', () => {
    expect(formatTokenAmount(1_500_000)).toMatch(/^1\.5M$/);
  });

  it('uses significant figures (not fixed decimals) for sub-1 values >= 0.0001', () => {
    // default 4 sig figs
    expect(formatTokenAmount(0.06132457)).toBe('0.06132');
    expect(formatTokenAmount(0.5)).toBe('0.5');
  });

  it('uses subscript notation for very small values', () => {
    // 0.00000245322 → 5 leading zeros after decimal, sig digits "2453"
    expect(formatTokenAmount(0.00000245322)).toBe('0.0₅2453');
    // 0.000123 → 3 leading zeros, sig digits "123"
    expect(formatTokenAmount(0.000001234)).toBe('0.0₅1234');
    // exactly at threshold uses standard form
    expect(formatTokenAmount(0.0001)).toBe('0.0001');
  });

  it('preserves negative sign in subscript form', () => {
    expect(formatTokenAmount(-0.0000005)).toBe('-0.0₆5');
  });
});

describe('formatUsd', () => {
  it('formats whole and fractional dollar amounts', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(42.5)).toBe('$42.50');
    expect(formatUsd(1234.5)).toBe('$1,234.50');
  });

  it('shows sub-cent values with significant digits', () => {
    expect(formatUsd(0.0042)).toMatch(/^\$0\.004/);
  });

  it('uses compact notation past one million', () => {
    expect(formatUsd(2_500_000)).toMatch(/^\$2\.5M$/);
  });
});
