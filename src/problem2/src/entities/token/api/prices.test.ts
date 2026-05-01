import { describe, it, expect } from 'vitest';
import { dedupeLatestPerCurrency } from './prices';

describe('dedupeLatestPerCurrency', () => {
  it('keeps a single record when no duplicates exist', () => {
    const out = dedupeLatestPerCurrency([
      { currency: 'ETH', date: '2024-01-01T00:00:00.000Z', price: 1 },
      { currency: 'BTC', date: '2024-01-01T00:00:00.000Z', price: 2 },
    ]);
    expect(out).toHaveLength(2);
  });

  it('keeps the record with the latest date when a currency repeats', () => {
    const out = dedupeLatestPerCurrency([
      { currency: 'BUSD', date: '2024-01-01T00:00:00.000Z', price: 0.99 },
      { currency: 'BUSD', date: '2024-01-02T00:00:00.000Z', price: 1.0 },
      { currency: 'BUSD', date: '2024-01-01T12:00:00.000Z', price: 1.01 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.price).toBe(1.0);
    expect(out[0]?.date).toBe('2024-01-02T00:00:00.000Z');
  });

  it('treats input order as irrelevant — latest date wins regardless', () => {
    const reversed = dedupeLatestPerCurrency([
      { currency: 'X', date: '2024-01-03T00:00:00.000Z', price: 3 },
      { currency: 'X', date: '2024-01-01T00:00:00.000Z', price: 1 },
    ]);
    expect(reversed[0]?.price).toBe(3);
  });

  it('returns an empty array for empty input', () => {
    expect(dedupeLatestPerCurrency([])).toEqual([]);
  });
});
