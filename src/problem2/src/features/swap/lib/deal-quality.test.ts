import { describe, it, expect } from 'vitest';
import { computeDealQuality } from './deal-quality';
import { computeRoutes } from './routes';

const baseInputs = { amountIn: 100, fromPriceUsd: 10, baseRate: 1 };
const routes = computeRoutes(baseInputs);

describe('computeDealQuality', () => {
  it('rangePosition is 1 when active is the best route', () => {
    const result = computeDealQuality({
      active: routes[0]!,
      routes,
      midRate: 1,
      amountIn: 100,
      toPriceUsd: 10,
    });
    expect(result.rangePosition).toBe(1);
    expect(result.savingsVsWorst).toBeGreaterThan(0);
  });

  it('rangePosition is 0 when active is the worst route', () => {
    const result = computeDealQuality({
      active: routes[routes.length - 1]!,
      routes,
      midRate: 1,
      amountIn: 100,
      toPriceUsd: 10,
    });
    expect(result.rangePosition).toBe(0);
    expect(result.savingsVsWorst).toBe(0);
  });

  it('spotGap reflects fee + slippage off the mid-rate', () => {
    const result = computeDealQuality({
      active: routes[0]!,
      routes,
      midRate: 1,
      amountIn: 100,
      toPriceUsd: 10,
    });
    expect(result.spotGap).toBeGreaterThan(0);
    expect(result.spotGap).toBeLessThan(0.05);
  });

  it('handles a degenerate single-route input', () => {
    const single = [routes[0]!];
    const result = computeDealQuality({
      active: single[0]!,
      routes: single,
      midRate: 1,
      amountIn: 100,
      toPriceUsd: 10,
    });
    expect(result.rangePosition).toBe(1);
    expect(result.savingsVsWorst).toBe(0);
  });
});
