import type { Token } from '@/entities/token';

/**
 * Mock market intelligence used to populate the empty-state of the
 * quotes panel: a stablecoin yield list and a trending-assets list.
 *
 * The brief explicitly allows mocking backend interactions; we derive
 * everything from a deterministic FNV-1a hash of the symbol so the
 * same token always shows the same APY and 24h change across reloads.
 * In production these would come from a `/markets` endpoint cached
 * via TanStack Query just like the prices feed.
 */

const STABLE_SYMBOLS = new Set(['USD', 'USDC', 'axlUSDC', 'BUSD', 'YieldUSD']);

const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
};

/** APY between 1.0% and 6.0%, deterministic per symbol. */
export const mockApy = (symbol: string): number => {
  const seed = fnv1a(symbol + 'apy');
  return 1 + (seed % 500) / 100;
};

/** 24h change between −9.99% and +14.99%, deterministic per symbol. */
export const mock24hChange = (symbol: string): number => {
  const seed = fnv1a(symbol + '24h');
  return -10 + (seed % 2500) / 100;
};

export const isStablecoin = (symbol: string): boolean => STABLE_SYMBOLS.has(symbol);

export const filterStablecoins = (tokens: readonly Token[]): Token[] =>
  tokens.filter((token) => isStablecoin(token.symbol));

export const getTrendingTokens = (
  tokens: readonly Token[],
  limit = 5,
): Token[] => {
  const nonStable = tokens.filter((token) => !isStablecoin(token.symbol));
  return nonStable
    .map((token) => ({ token, change: mock24hChange(token.symbol) }))
    .sort((a, b) => b.change - a.change)
    .slice(0, limit)
    .map(({ token }) => token);
};
