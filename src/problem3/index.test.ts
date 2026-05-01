/**
 * Tests for the pure helpers in `index.tsx`.
 *
 * Component-level tests (loading/empty/error branches, list rendering) are
 * intentionally out of scope here — they require a React renderer setup
 * (jsdom + RTL) which is bigger than the refactor itself. Pure functions
 * are where the correctness invariants live; the rest is orchestration.
 *
 * Run with `vitest run` (or any compatible runner — assertions are plain).
 */

import { describe, expect, it } from 'vitest';
import {
  compareByPriorityDesc,
  computeUsdValue,
  formatAmount,
  getPriority,
  type WalletBalance,
} from './index';

// ---------------------------------------------------------------------------
// getPriority
// ---------------------------------------------------------------------------

describe('getPriority', () => {
  it('returns the configured priority for every known chain', () => {
    expect(getPriority('Osmosis')).toBe(100);
    expect(getPriority('Ethereum')).toBe(50);
    expect(getPriority('Arbitrum')).toBe(30);
    expect(getPriority('Zilliqa')).toBe(20);
    expect(getPriority('Neo')).toBe(20);
  });

  it('is total — every Blockchain literal returns a finite number', () => {
    // The closed `Blockchain` union means TS won't even compile a call
    // with an unknown chain, so this property is enforced at compile time.
    // The test below just guards against accidental regressions if someone
    // widens the union to `string` without updating the lookup table.
    const known: ReadonlyArray<WalletBalance['blockchain']> = [
      'Osmosis',
      'Ethereum',
      'Arbitrum',
      'Zilliqa',
      'Neo',
    ];
    for (const chain of known) {
      expect(Number.isFinite(getPriority(chain))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// compareByPriorityDesc
// ---------------------------------------------------------------------------

const make = (
  currency: string,
  blockchain: WalletBalance['blockchain'],
): WalletBalance => ({ currency, amount: 1, blockchain });

describe('compareByPriorityDesc', () => {
  it('orders chains by priority descending', () => {
    const list = [
      make('NEO', 'Neo'),
      make('OSMO', 'Osmosis'),
      make('ETH', 'Ethereum'),
      make('ARB', 'Arbitrum'),
    ];
    const sorted = [...list].sort(compareByPriorityDesc).map((b) => b.currency);
    expect(sorted).toEqual(['OSMO', 'ETH', 'ARB', 'NEO']);
  });

  it('breaks priority ties alphabetically — order is independent of input', () => {
    // Zilliqa and Neo both have priority 20. The output should be the same
    // regardless of which one came first in the input array.
    const a = [...[make('ZIL', 'Zilliqa'), make('NEO', 'Neo')]].sort(
      compareByPriorityDesc,
    );
    const b = [...[make('NEO', 'Neo'), make('ZIL', 'Zilliqa')]].sort(
      compareByPriorityDesc,
    );
    expect(a.map((x) => x.currency)).toEqual(['NEO', 'ZIL']);
    expect(b.map((x) => x.currency)).toEqual(['NEO', 'ZIL']);
  });

  it('always returns a number (no implicit undefined branch)', () => {
    const result = compareByPriorityDesc(
      make('A', 'Ethereum'),
      make('A', 'Ethereum'),
    );
    expect(typeof result).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// computeUsdValue
// ---------------------------------------------------------------------------

describe('computeUsdValue', () => {
  it('multiplies price by amount when both are finite', () => {
    expect(computeUsdValue(2, 5)).toBe(10);
    expect(computeUsdValue(3200, 0.5)).toBe(1600);
  });

  it('returns null when the price is missing — never NaN to the UI', () => {
    expect(computeUsdValue(undefined, 5)).toBeNull();
  });

  it('returns null when the price is non-finite', () => {
    expect(computeUsdValue(NaN, 5)).toBeNull();
    expect(computeUsdValue(Infinity, 5)).toBeNull();
  });

  it('returns null when the amount is non-finite', () => {
    expect(computeUsdValue(2, NaN)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatAmount
// ---------------------------------------------------------------------------

describe('formatAmount', () => {
  it('formats with thousands separator and 2–6 fraction digits', () => {
    expect(formatAmount(1234.5)).toBe('1,234.50');
    expect(formatAmount(0.123456789)).toBe('0.123457');
  });

  it('returns an em-dash for non-finite input — never NaN to the UI', () => {
    expect(formatAmount(NaN)).toBe('—');
    expect(formatAmount(Infinity)).toBe('—');
  });
});
