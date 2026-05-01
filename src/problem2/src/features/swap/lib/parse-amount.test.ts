import { describe, it, expect } from 'vitest';
import { parseAmount, sanitizeAmountInput, stringifyAmount } from './parse-amount';

describe('parseAmount', () => {
  it.each([
    ['', null],
    ['.', null],
    ['-', null],
    ['abc', null],
    ['1.2.3', null],
    ['0', 0],
    ['12.34', 12.34],
    ['12,345.67', 12345.67],
    ['  42 ', 42],
  ])('parseAmount(%j) → %j', (input, expected) => {
    expect(parseAmount(input as string)).toBe(expected);
  });
});

describe('sanitizeAmountInput', () => {
  it('drops letters and keeps a single decimal point', () => {
    expect(sanitizeAmountInput('a1b2.3c.4')).toBe('12.34');
  });

  it('preserves a trailing dot so "12." can keep being typed', () => {
    expect(sanitizeAmountInput('12.')).toBe('12.');
  });

  it('returns empty for entirely invalid input', () => {
    expect(sanitizeAmountInput('abc')).toBe('');
  });
});

describe('stringifyAmount', () => {
  it('returns "0" for zero', () => {
    expect(stringifyAmount(0)).toBe('0');
  });

  it('strips trailing zeros after the decimal', () => {
    expect(stringifyAmount(0.1)).toBe('0.1');
    expect(stringifyAmount(12.5)).toBe('12.5');
  });

  it('uses higher precision for sub-1 values', () => {
    expect(stringifyAmount(0.0000234567)).toMatch(/^0\.0000234/);
  });

  it('does not return scientific notation for typical swap amounts', () => {
    expect(stringifyAmount(1234.5678)).not.toMatch(/e/);
  });

  it('caps the fractional part at 9 characters by default', () => {
    const out = stringifyAmount(0.12345678999);
    const frac = out.split('.')[1] ?? '';
    expect(frac.length).toBeLessThanOrEqual(9);
  });

  it('avoids scientific notation for very small magnitudes', () => {
    const out = stringifyAmount(0.00000001234);
    expect(out).not.toMatch(/e/);
    expect(out.startsWith('0.')).toBe(true);
  });

  it('honors a custom maxDecimals option', () => {
    const out = stringifyAmount(0.123456789, { maxDecimals: 3 });
    expect(out).toBe('0.123');
  });
});
