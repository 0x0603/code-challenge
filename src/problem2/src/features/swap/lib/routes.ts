/**
 * Mock multi-DEX quote engine.
 *
 * The challenge brief lets us simulate the backend, so we model four
 * fictional DEXes with distinct fee structures and slippage curves.
 * Each curve takes the trade size in USD and returns a fractional
 * slippage that gets applied on top of the venue's flat fee.
 *
 * The shapes are tuned so that the *ranking* of routes shifts with
 * trade size — small trades favor low-fee venues (OrderBook), large
 * trades favor flat-slippage pools (StablePool, Aggregator). That's
 * the "feature" RouteCompare reveals: the same swap is not a single
 * answer.
 */

export type DexId = 'amm' | 'orderbook' | 'stable' | 'aggregator';

export type DexProfile = {
  readonly id: DexId;
  readonly name: string;
  readonly tagline: string;
  readonly feeBps: number;
  /** Returns fractional slippage (0.001 = 0.1%) given a USD trade size. */
  readonly slippage: (amountUsd: number) => number;
  /** Hex color used for the route-graph stroke. */
  readonly color: string;
};

export const DEX_PROFILES: readonly DexProfile[] = [
  {
    id: 'amm',
    name: 'AMM-DEX',
    tagline: 'Constant-product pool',
    feeBps: 30,
    slippage: (usd) => 0.00005 * Math.sqrt(usd),
    color: '#0F5132',
  },
  {
    id: 'orderbook',
    name: 'OrderBook',
    tagline: 'Limit-order matched',
    feeBps: 5,
    slippage: (usd) => 0.0000012 * usd,
    color: '#B45309',
  },
  {
    id: 'stable',
    name: 'StablePool',
    tagline: 'Curve-style stable pool',
    feeBps: 20,
    slippage: () => 0.0008,
    color: '#1E3A5F',
  },
  {
    id: 'aggregator',
    name: 'Aggregator',
    tagline: 'Splits across venues',
    feeBps: 10,
    slippage: () => 0.0012,
    color: '#7C3AED',
  },
];

export type QuoteRoute = {
  readonly dex: DexProfile;
  readonly expectedReceive: number;
  readonly effectiveRate: number;
  readonly feeUsd: number;
  readonly slippage: number;
  /** Fractional difference vs the best route's `expectedReceive`. ≤ 0. */
  readonly deltaFromBest: number;
  readonly rank: number;
};

export type ComputeRoutesParams = {
  amountIn: number;
  fromPriceUsd: number;
  /** Mid-rate: how many `to` tokens per 1 `from` token before fees/slippage. */
  baseRate: number;
};

/**
 * Pure ranking function. Doesn't touch React state, so it's trivial to
 * unit-test and can run in any context (server-side, worker, etc.).
 */
export const computeRoutes = ({
  amountIn,
  fromPriceUsd,
  baseRate,
}: ComputeRoutesParams): QuoteRoute[] => {
  if (amountIn <= 0 || baseRate <= 0 || fromPriceUsd <= 0) return [];
  const amountUsd = amountIn * fromPriceUsd;

  const evaluated = DEX_PROFILES.map((dex) => {
    const fee = dex.feeBps / 10_000;
    const slip = dex.slippage(amountUsd);
    const effectiveRate = baseRate * (1 - fee) * (1 - slip);
    const expectedReceive = amountIn * effectiveRate;
    const feeUsd = amountUsd * fee;
    return {
      dex,
      expectedReceive,
      effectiveRate,
      feeUsd,
      slippage: slip,
    };
  }).sort((a, b) => b.expectedReceive - a.expectedReceive);

  const bestReceive = evaluated[0]?.expectedReceive ?? 0;

  return evaluated.map((entry, index) => ({
    ...entry,
    deltaFromBest: bestReceive === 0 ? 0 : (entry.expectedReceive - bestReceive) / bestReceive,
    rank: index,
  }));
};
