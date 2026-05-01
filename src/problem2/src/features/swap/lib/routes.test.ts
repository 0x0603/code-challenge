import { describe, it, expect } from 'vitest';
import { computeRoutes, DEX_PROFILES } from './routes';

const baseParams = {
  amountIn: 1,
  fromPriceUsd: 1000, // $1k worth — meaningful slippage range
  baseRate: 1,
};

describe('computeRoutes', () => {
  it('returns one route per DEX profile', () => {
    const routes = computeRoutes(baseParams);
    expect(routes).toHaveLength(DEX_PROFILES.length);
  });

  it('returns an empty array for non-positive inputs', () => {
    expect(computeRoutes({ ...baseParams, amountIn: 0 })).toEqual([]);
    expect(computeRoutes({ ...baseParams, baseRate: 0 })).toEqual([]);
    expect(computeRoutes({ ...baseParams, fromPriceUsd: -1 })).toEqual([]);
  });

  it('ranks routes by expectedReceive, descending', () => {
    const routes = computeRoutes(baseParams);
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i]!.expectedReceive).toBeLessThanOrEqual(routes[i - 1]!.expectedReceive);
    }
    expect(routes[0]!.rank).toBe(0);
    expect(routes[0]!.deltaFromBest).toBe(0);
  });

  it('reports negative deltaFromBest for non-leading routes', () => {
    const [, ...rest] = computeRoutes(baseParams);
    for (const route of rest) {
      expect(route.deltaFromBest).toBeLessThan(0);
    }
  });

  it('shifts the ranking when trade size changes (small vs large)', () => {
    const small = computeRoutes({ ...baseParams, fromPriceUsd: 10 }); // $10 trade
    const large = computeRoutes({ ...baseParams, fromPriceUsd: 100_000 }); // $100k

    // Smallest trade should favor the lowest-fee venue (OrderBook, 5bps)
    // since slippage is negligible.
    expect(small[0]!.dex.id).toBe('orderbook');

    // For very large trades the ranking should NOT still be OrderBook
    // (its linear slippage dominates fee savings).
    expect(large[0]!.dex.id).not.toBe('orderbook');
  });

  it('preserves invariants: fee + slippage explain the rate gap', () => {
    const routes = computeRoutes(baseParams);
    for (const r of routes) {
      const expected = baseParams.baseRate * (1 - r.dex.feeBps / 10_000) * (1 - r.slippage);
      expect(r.effectiveRate).toBeCloseTo(expected, 12);
    }
  });
});
