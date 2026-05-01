import { useToken, type Token } from '@/entities/token';

export type ExchangeRate = {
  /** How many `to` tokens you get per 1 `from` token. `null` while pricing data isn't ready. */
  readonly rate: number | null;
  readonly fromToken: Token | undefined;
  readonly toToken: Token | undefined;
};

/**
 * The single source of truth for "1 fromToken = X toToken" used across the
 * SwapForm, RouteCompare, and DealQuality components. Returns `null` when
 * either token is unknown so callers can render a clean "—" instead of NaN.
 *
 * Both prices come from the same /prices.json snapshot, so the rate is
 * implicitly the spot mid-rate. M5 layers per-DEX fees and slippage on top
 * of this baseline; this hook intentionally stays unfeed-of-fees.
 */
export const useExchangeRate = (
  fromSymbol: string | null,
  toSymbol: string | null,
): ExchangeRate => {
  const fromToken = useToken(fromSymbol);
  const toToken = useToken(toSymbol);

  if (!fromToken || !toToken || toToken.priceUsd === 0) {
    return { rate: null, fromToken, toToken };
  }

  return {
    rate: fromToken.priceUsd / toToken.priceUsd,
    fromToken,
    toToken,
  };
};
