import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tokensQueryKey } from '@/entities/token';

/**
 * Re-fetches the price feed. The countdown calls this whenever a quote
 * expires; new prices flow through useExchangeRate → useRoutes and the
 * displayed amounts update naturally without any per-component plumbing.
 */
export const useQuoteRefresh = () => {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: tokensQueryKey }),
    [queryClient],
  );
};
