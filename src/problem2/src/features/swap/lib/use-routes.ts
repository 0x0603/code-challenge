import { useMemo } from 'react';
import { useExchangeRate } from './exchange-rate';
import { computeRoutes, type QuoteRoute } from './routes';

type UseRoutesArgs = {
  amountIn: number | null;
  fromSymbol: string | null;
  toSymbol: string | null;
};

export type UseRoutesResult = {
  routes: QuoteRoute[];
  bestRoute: QuoteRoute | null;
  baseRate: number | null;
};

/**
 * React-flavored quote engine. Delegates the math to `computeRoutes`
 * (pure, testable) and joins it with the live token prices. The hook is
 * memoized on the inputs so RouteCompare doesn't recompute every keystroke
 * — only when the amount or pair actually changes.
 */
export const useRoutes = ({
  amountIn,
  fromSymbol,
  toSymbol,
}: UseRoutesArgs): UseRoutesResult => {
  const { rate, fromToken } = useExchangeRate(fromSymbol, toSymbol);

  return useMemo(() => {
    if (amountIn === null || amountIn <= 0 || !fromToken || rate === null) {
      return { routes: [], bestRoute: null, baseRate: rate };
    }
    const routes = computeRoutes({
      amountIn,
      fromPriceUsd: fromToken.priceUsd,
      baseRate: rate,
    });
    return {
      routes,
      bestRoute: routes[0] ?? null,
      baseRate: rate,
    };
  }, [amountIn, fromToken, rate]);
};
