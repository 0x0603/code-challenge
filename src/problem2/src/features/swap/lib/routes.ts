/**
 * Mock multi-DEX quote engine.
 *
 * The challenge brief lets us simulate the backend, so we model four
 * archetypes — constant-product AMM, central-limit orderbook, stable
 * pool, and aggregator — branded with the real-world names users
 * recognize (Uniswap, dYdX, Curve, 1inch). Each curve takes the trade
 * size in USD and returns a fractional slippage applied on top of the
 * venue's flat fee.
 *
 * The fee + slippage values are *not* the real venue parameters; they
 * are tuned so the ranking shifts with trade size, which is the point
 * of comparing. Small trades favor low-fee orderbooks (dYdX); large
 * trades favor flat-slippage pools (Curve, 1inch). RouteCompare
 * reveals that the same swap is not a single answer.
 */

export type DexId = 'amm' | 'orderbook' | 'stable' | 'aggregator';

export type DexProfile = {
  readonly id: DexId;
  readonly name: string;
  readonly tagline: string;
  readonly feeBps: number;
  /** Returns fractional slippage (0.001 = 0.1%) given a USD trade size. */
  readonly slippage: (amountUsd: number) => number;
  /** Hex color used for accent rows and the brand-square fallback. */
  readonly color: string;
  /** Brand logo URL (DefiLlama protocol icons CDN). */
  readonly logoUrl: string;
};

const LOGO_BASE = 'https://icons.llamao.fi/icons/protocols';

export const DEX_PROFILES: readonly DexProfile[] = [
  {
    id: 'amm',
    name: 'Uniswap',
    tagline: 'Constant-product AMM',
    feeBps: 30,
    slippage: (usd) => 0.00005 * Math.sqrt(usd),
    color: '#FF007A',
    logoUrl: `${LOGO_BASE}/uniswap?w=64&h=64`,
  },
  {
    id: 'orderbook',
    name: 'dYdX',
    tagline: 'Central-limit orderbook',
    feeBps: 5,
    slippage: (usd) => 0.0000012 * usd,
    color: '#6966FF',
    logoUrl: `${LOGO_BASE}/dydx?w=64&h=64`,
  },
  {
    id: 'stable',
    name: 'Curve',
    tagline: 'Stable pool with low slippage',
    feeBps: 20,
    slippage: () => 0.0008,
    color: '#A6192E',
    logoUrl: `${LOGO_BASE}/curve-finance?w=64&h=64`,
  },
  {
    id: 'aggregator',
    name: '1inch',
    tagline: 'Aggregator across venues',
    feeBps: 10,
    slippage: () => 0.0012,
    color: '#1F2C3D',
    logoUrl: `${LOGO_BASE}/1inch-network?w=64&h=64`,
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
