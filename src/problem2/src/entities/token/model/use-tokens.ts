import { useQuery } from '@tanstack/react-query';
import { fetchTokens } from '../api/prices';
import type { Token } from './types';

export const tokensQueryKey = ['tokens'] as const;

/**
 * Single source of truth for the token list. All consumers (TokenSelect,
 * SwapForm, RouteCompare) read from this one query so the cache de-dupes
 * the network call automatically — no prop-drilling and no global store.
 */
export const useTokens = () =>
  useQuery({
    queryKey: tokensQueryKey,
    queryFn: ({ signal }) => fetchTokens(signal),
    staleTime: 60_000,
  });

/**
 * Quick lookup by symbol. Returns `undefined` if the token is not in the
 * feed; callers are expected to handle the missing case rather than be
 * surprised by it (e.g. when a previously-saved recent token disappears
 * from the feed).
 */
export const useToken = (symbol: string | null | undefined): Token | undefined => {
  const { data } = useTokens();
  if (!symbol || !data) return undefined;
  return data.find((token) => token.symbol === symbol);
};
