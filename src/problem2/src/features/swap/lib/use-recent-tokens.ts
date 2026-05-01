import { useCallback } from 'react';
import { useLocalStorage } from '@/shared/hooks';

const STORAGE_KEY = 'flowswap.recent-tokens.v1';
const DEFAULT_LIMIT = 6;

/**
 * Persist recently picked tokens so a returning user sees their usual
 * pairs at the top of TokenSelect. Most-recent-first; selecting an
 * already-recent token bubbles it back to the front rather than
 * duplicating.
 *
 * Keyed by version (`.v1`) so we can change the shape later without
 * crashing on old saved values.
 */
export const useRecentTokens = (limit = DEFAULT_LIMIT) => {
  const [recent, setRecent] = useLocalStorage<string[]>(STORAGE_KEY, []);

  const remember = useCallback(
    (symbol: string) => {
      setRecent((prev) => {
        const without = prev.filter((s) => s !== symbol);
        return [symbol, ...without].slice(0, limit);
      });
    },
    [setRecent, limit],
  );

  return [recent, remember] as const;
};
