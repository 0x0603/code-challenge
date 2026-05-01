import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TokenIcon, useTokens, type Token } from '@/entities/token';
import { cn } from '@/shared/lib/cn';
import {
  filterStablecoins,
  getTrendingTokens,
  mock24hChange,
  mockApy,
} from '../lib/market-data';

type MarketSidebarProps = {
  /** Called when the user picks a token; lifts it into the receive slot. */
  onSelectToken: (symbol: string) => void;
};

/**
 * The empty-state of the quotes panel. Once an amount is entered, this
 * is replaced by the live route comparison; while the form is empty,
 * we surface stablecoin yields and trending assets so the user has
 * something to anchor on.
 *
 * All market metrics here are mocked deterministically per symbol —
 * the brief allows simulating the backend, and the data shape is
 * what a real `/markets` endpoint would return.
 */
export const MarketSidebar = ({ onSelectToken }: MarketSidebarProps) => {
  const { data: tokens, isLoading } = useTokens();
  const stables = useMemo(() => filterStablecoins(tokens ?? []), [tokens]);
  const trending = useMemo(() => getTrendingTokens(tokens ?? []), [tokens]);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-ink-3">Loading markets…</div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Stablecoins">
        {stables.length === 0 ? (
          <EmptyRow label="No stablecoins in feed." />
        ) : (
          <ul className="space-y-1">
            {stables.map((token, idx) => (
              <Row
                key={token.symbol}
                token={token}
                index={idx}
                trailing={
                  <span className="text-xs px-2 py-1 rounded-full bg-bg/60 dark:bg-bg/40 text-ink-2 font-mono tabular">
                    {mockApy(token.symbol).toFixed(2)}% APY
                  </span>
                }
                onSelect={onSelectToken}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Trending Assets"
        trailing={
          <button
            type="button"
            disabled
            className="text-xs text-ink-3 px-2 py-1 rounded-md border border-border-subtle"
            aria-label="Timeframe (mocked)"
          >
            1D ▾
          </button>
        }
      >
        {trending.length === 0 ? (
          <EmptyRow label="No trending data." />
        ) : (
          <ul className="space-y-1">
            {trending.map((token, idx) => {
              const change = mock24hChange(token.symbol);
              return (
                <Row
                  key={token.symbol}
                  token={token}
                  index={idx}
                  trailing={
                    <span
                      className={cn(
                        'text-sm font-mono tabular tracking-tight',
                        change >= 0 ? 'text-positive' : 'text-negative',
                      )}
                    >
                      {change >= 0 ? '+' : '−'}
                      {Math.abs(change).toFixed(2)}%
                    </span>
                  }
                  onSelect={onSelectToken}
                />
              );
            })}
          </ul>
        )}
      </Section>

      <p className="text-[11px] text-ink-3 leading-relaxed pt-2">
        Market data is mocked for the demo and does not constitute any
        recommendation or financial advice.
      </p>
    </div>
  );
};

const Section = ({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section>
    <header className="flex items-center justify-between mb-2 px-1">
      <h4 className="text-base font-medium tracking-tight text-ink-1">{title}</h4>
      {trailing}
    </header>
    {children}
  </section>
);

const Row = ({
  token,
  index,
  trailing,
  onSelect,
}: {
  token: Token;
  index: number;
  trailing: React.ReactNode;
  onSelect: (symbol: string) => void;
}) => (
  <motion.li
    initial={{ opacity: 0, x: -4 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.03, duration: 0.18 }}
  >
    <button
      type="button"
      onClick={() => onSelect(token.symbol)}
      className={cn(
        'w-full flex items-center gap-3 px-2 py-2 rounded-input',
        'text-left transition-colors',
        'hover:bg-bg/60 dark:hover:bg-bg/40',
        'focus-visible:outline-none focus-visible:bg-bg/80',
      )}
    >
      <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} size={28} />
      <span className="flex-1 font-medium text-ink-1 truncate">{token.symbol}</span>
      {trailing}
    </button>
  </motion.li>
);

const EmptyRow = ({ label }: { label: string }) => (
  <p className="text-sm text-ink-3 px-2 py-3">{label}</p>
);
