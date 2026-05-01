import type { QuoteRoute } from './routes';

export type DealQuality = {
  /** 0..1 — where the active route's rate sits between worst and best. */
  rangePosition: number;
  /** Fractional loss vs spot mid-rate (fees + slippage). */
  spotGap: number;
  /** Token-out units saved vs the worst available route. */
  savingsVsWorst: number;
  /** USD-equivalent of `savingsVsWorst`. */
  savingsUsd: number;
};

type ComputeArgs = {
  active: QuoteRoute;
  routes: QuoteRoute[];
  midRate: number;
  amountIn: number;
  toPriceUsd: number;
};

/**
 * Pure metric. Captures three angles a thoughtful user actually cares
 * about: how the chosen route ranks against alternatives (`rangePosition`),
 * how much was lost to fees/slippage vs the theoretical mid-rate
 * (`spotGap`), and the dollar savings vs the worst-available route
 * (`savingsVsWorst` / `savingsUsd`). All four are derived from the same
 * inputs so they stay consistent in the UI.
 */
export const computeDealQuality = ({
  active,
  routes,
  midRate,
  amountIn,
  toPriceUsd,
}: ComputeArgs): DealQuality => {
  if (routes.length === 0) {
    return { rangePosition: 1, spotGap: 0, savingsVsWorst: 0, savingsUsd: 0 };
  }

  const best = routes[0]!.effectiveRate;
  const worst = routes[routes.length - 1]!.effectiveRate;

  const rangePosition =
    best === worst ? 1 : (active.effectiveRate - worst) / (best - worst);
  const spotGap = midRate > 0 ? (midRate - active.effectiveRate) / midRate : 0;
  const savingsVsWorst = (active.effectiveRate - worst) * amountIn;
  const savingsUsd = savingsVsWorst * toPriceUsd;

  return {
    rangePosition: Math.max(0, Math.min(1, rangePosition)),
    spotGap,
    savingsVsWorst,
    savingsUsd,
  };
};
