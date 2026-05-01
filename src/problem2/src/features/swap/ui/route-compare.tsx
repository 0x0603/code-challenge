import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatTokenAmount, formatUsd, useToken } from '@/entities/token';
import { cn } from '@/shared/lib/cn';
import { useRoutes } from '../lib/use-routes';
import { MarketSidebar } from './market-sidebar';
import type { DexId, QuoteRoute } from '../lib/routes';

type RouteCompareProps = {
  amountIn: number | null;
  fromSymbol: string | null;
  toSymbol: string | null;
  activeDexId: DexId | null;
  onSelect: (dexId: DexId) => void;
  locked?: boolean;
  /** Live MM:SS countdown until the quote refresh cycle. */
  remainingMs: number;
  countdownActive: boolean;
  /** Called when the user picks a market token (lifts into the receive slot). */
  onPickMarketToken: (symbol: string) => void;
};

/**
 * Quote selection panel, Ledger-style. The best route gets its own
 * "Best quote" section with a highlighted card; the rest fall under
 * "More quotes" as a compact list. A live MM:SS countdown sits in the
 * header so the user knows how long the displayed numbers remain valid.
 *
 * The panel always renders so the page layout doesn't shift when an
 * amount is entered or cleared. Empty state explains what's needed
 * to see live quotes.
 */
export const RouteCompare = ({
  amountIn,
  fromSymbol,
  toSymbol,
  activeDexId,
  onSelect,
  locked = false,
  remainingMs,
  countdownActive,
  onPickMarketToken,
}: RouteCompareProps) => {
  const { routes } = useRoutes({ amountIn, fromSymbol, toSymbol });
  const toToken = useToken(toSymbol);
  const hasRoutes = routes.length > 0;
  const [bestRoute, ...moreRoutes] = routes;

  return (
    <section
      className="rounded-card bg-surface border border-border-subtle p-5 sm:p-6 h-full"
      aria-label="Swap quotes"
    >
      <header className="flex items-center justify-between mb-5">
        <h3 className="text-base font-medium tracking-tight">
          {hasRoutes ? 'Select a quote' : 'Markets'}
        </h3>
        {hasRoutes && countdownActive ? (
          <CountdownTimer remainingMs={remainingMs} />
        ) : null}
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {!hasRoutes ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MarketSidebar onSelectToken={onPickMarketToken} />
          </motion.div>
        ) : (
          <motion.div
            key="routes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {bestRoute && (
              <Section title="Best quote" hint="Most you'll receive after fees">
                <QuoteCard
                  route={bestRoute}
                  toSymbol={toSymbol ?? ''}
                  toPriceUsd={toToken?.priceUsd}
                  isActive={bestRoute.dex.id === activeDexId}
                  isBest
                  onSelect={onSelect}
                  locked={locked}
                />
              </Section>
            )}

            {moreRoutes.length > 0 && (
              <Section title="More quotes">
                <div className="space-y-2">
                  {moreRoutes.map((route) => (
                    <QuoteCard
                      key={route.dex.id}
                      route={route}
                      toSymbol={toSymbol ?? ''}
                      toPriceUsd={toToken?.priceUsd}
                      isActive={route.dex.id === activeDexId}
                      onSelect={onSelect}
                      locked={locked}
                    />
                  ))}
                </div>
              </Section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

const Section = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-baseline justify-between mb-2 px-1">
      <h4 className="text-sm font-medium text-ink-2">{title}</h4>
      {hint ? <span className="text-[11px] text-ink-3">{hint}</span> : null}
    </div>
    {children}
  </div>
);

type QuoteCardProps = {
  route: QuoteRoute;
  toSymbol: string;
  toPriceUsd: number | undefined;
  isActive: boolean;
  isBest?: boolean;
  onSelect: (id: DexId) => void;
  locked: boolean;
};

const QuoteCard = ({
  route,
  toSymbol,
  toPriceUsd,
  isActive,
  isBest = false,
  onSelect,
  locked,
}: QuoteCardProps) => {
  const usd = toPriceUsd ? route.expectedReceive * toPriceUsd : null;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(route.dex.id)}
      disabled={locked}
      aria-pressed={isActive}
      whileTap={{ scale: locked ? 1 : 0.99 }}
      className={cn(
        'w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 text-left',
        'rounded-input border transition-colors',
        'focus-visible:outline-none focus-visible:shadow-focus-ring',
        isActive
          ? 'border-accent/50 bg-accent-soft/40'
          : 'border-border-subtle bg-bg/40 hover:border-ink-3/40 hover:bg-bg/60',
        'disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      <BrandLogo
        color={route.dex.color}
        logoUrl={route.dex.logoUrl}
        initial={route.dex.name[0] ?? '?'}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-ink-1 truncate">{route.dex.name}</span>
          {isActive && !isBest && (
            <span className="text-[10px] uppercase tracking-wider text-accent font-semibold">
              Selected
            </span>
          )}
        </div>
        <div className="text-xs text-ink-3 mt-0.5 truncate">
          Network Fees {formatUsd(route.feeUsd)}
        </div>
      </div>

      <div className="text-right shrink-0 min-w-0">
        <div className="font-mono tabular text-sm sm:text-base text-ink-1">
          ~{formatTokenAmount(route.expectedReceive)} {toSymbol}
        </div>
        <div className="text-xs text-ink-3 font-mono tabular mt-0.5">
          {usd !== null ? formatUsd(usd) : '—'}
        </div>
      </div>
    </motion.button>
  );
};

const BrandLogo = ({
  color,
  logoUrl,
  initial,
}: {
  color: string;
  logoUrl: string;
  initial: string;
}) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        aria-hidden
        style={{ backgroundColor: color }}
        className="inline-flex items-center justify-center shrink-0 h-11 w-11 rounded-xl text-white font-semibold text-lg shadow-sm"
      >
        {initial.toUpperCase()}
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{ backgroundColor: color }}
      className="inline-flex items-center justify-center shrink-0 h-11 w-11 rounded-xl overflow-hidden shadow-sm"
    >
      <img
        src={logoUrl}
        alt=""
        width={44}
        height={44}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
};

const CountdownTimer = ({ remainingMs }: { remainingMs: number }) => {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const isWarning = remainingMs <= 5000;
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs font-mono tabular',
        isWarning ? 'text-warning' : 'text-ink-3',
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping',
            isWarning ? 'bg-warning' : 'bg-accent',
          )}
        />
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            isWarning ? 'bg-warning' : 'bg-accent',
          )}
        />
      </span>
      <span>
        {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
      </span>
    </div>
  );
};
