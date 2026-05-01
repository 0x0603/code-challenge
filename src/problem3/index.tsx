import React, { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * Closed union — the only chains the wallet recognises. Adding a chain is
 * a compile-time event: TS forces both `PRIORITY_BY_CHAIN` and any
 * `WalletBalance` literal to update together. No runtime sentinel needed.
 */
export type Blockchain =
  | 'Osmosis'
  | 'Ethereum'
  | 'Arbitrum'
  | 'Zilliqa'
  | 'Neo';

export interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: Blockchain;
}

export interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
  usdValue: number | null;
}

type Props = React.HTMLAttributes<HTMLDivElement>;

// ---------------------------------------------------------------------------
// Pure helpers (module-scoped — no per-render allocation)
// ---------------------------------------------------------------------------

const PRIORITY_BY_CHAIN: Readonly<Record<Blockchain, number>> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
};

export function getPriority(blockchain: Blockchain): number {
  return PRIORITY_BY_CHAIN[blockchain];
}

const amountFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

export function formatAmount(amount: number): string {
  return Number.isFinite(amount) ? amountFormatter.format(amount) : '—';
}

/**
 * Sort by chain priority desc. When priorities tie (e.g. Zilliqa vs Neo,
 * both 20) fall back to alphabetical order on currency so the UI is
 * deterministic across renders and reloads.
 */
export function compareByPriorityDesc(
  a: WalletBalance,
  b: WalletBalance,
): number {
  const diff = getPriority(b.blockchain) - getPriority(a.blockchain);
  return diff !== 0 ? diff : a.currency.localeCompare(b.currency);
}

/**
 * Returns `null` (not `NaN`) when the price is missing or non-finite, so
 * the row layer can render an em-dash instead of leaking `NaN` to users.
 */
export function computeUsdValue(
  price: number | undefined,
  amount: number,
): number | null {
  if (price === undefined || !Number.isFinite(price)) return null;
  if (!Number.isFinite(amount)) return null;
  return price * amount;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const WalletPage: React.FC<Props> = (props) => {
  const { children, ...rest } = props;
  const balances = useWalletBalances();
  const prices = usePrices();

  // Single memoised pipeline: filter → sort → decorate.
  // Deps are exactly what the body reads (balances, prices) — no false dep
  // like the original's `prices` on a memo that didn't read prices.
  const formattedBalances = useMemo<FormattedWalletBalance[]>(() => {
    return balances
      .filter((b) => b.amount > 0)
      .sort(compareByPriorityDesc)
      .map((b) => ({
        ...b,
        formatted: formatAmount(b.amount),
        usdValue: computeUsdValue(prices[b.currency], b.amount),
      }));
  }, [balances, prices]);

  return (
    <div {...rest}>
      {formattedBalances.map((balance) => (
        <WalletRow
          // Composite key: stable across re-sort, unique per (chain, asset).
          key={`${balance.blockchain}:${balance.currency}`}
          amount={balance.amount}
          usdValue={balance.usdValue}
          formattedAmount={balance.formatted}
        />
      ))}
      {children}
    </div>
  );
};

export default WalletPage;
