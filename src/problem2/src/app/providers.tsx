import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * Single TanStack Query client per app instance. Defaults are tuned for a
 * swap-form workload: prices update slowly so we keep a fresh window of 30s,
 * and we avoid window-focus refetches because the form itself owns the
 * quote-refresh cadence (M6 state machine). Letting both fight would cause
 * jitter in displayed amounts.
 */
const buildQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(buildQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
