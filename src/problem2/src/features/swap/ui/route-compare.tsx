import { AnimatePresence, motion } from 'framer-motion';
import { formatTokenAmount, formatUsd } from '@/entities/token';
import { cn } from '@/shared/lib/cn';
import { useRoutes } from '../lib/use-routes';
import type { DexId, QuoteRoute } from '../lib/routes';

type RouteCompareProps = {
  amountIn: number | null;
  fromSymbol: string | null;
  toSymbol: string | null;
  /** Currently active route — usually the best, or a user-overridden pick. */
  activeDexId: DexId | null;
  onSelect: (dexId: DexId) => void;
  /** When true, clicks are ignored (form is in a confirming/success state). */
  locked?: boolean;
};

/**
 * Ranks the available DEX routes for the current swap and renders them
 * as a clickable list. Best route carries the green "Best" badge; the
 * route the user is actually committing to carries a "Selected" border.
 * The two often coincide; when they don't, the row layout makes the cost
 * of the override legible (a negative delta below the amount).
 */
export const RouteCompare = ({
  amountIn,
  fromSymbol,
  toSymbol,
  activeDexId,
  onSelect,
  locked = false,
}: RouteCompareProps) => {
  const { routes } = useRoutes({ amountIn, fromSymbol, toSymbol });
  const visible = routes.length > 0 && toSymbol !== null;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.section
          key="routes"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
          className="overflow-hidden"
          aria-label="Available swap routes"
        >
          <div className="mt-6 rounded-input border border-border-subtle bg-bg/40 dark:bg-bg/20">
            <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <span className="text-xs uppercase tracking-wider text-ink-3">
                Routes
              </span>
              <span className="text-xs text-ink-3">
                Tap to switch · Best of {routes.length}
              </span>
            </header>
            <ul className="divide-y divide-border-subtle">
              {routes.map((route, index) => (
                <RouteRow
                  key={route.dex.id}
                  route={route}
                  toSymbol={toSymbol ?? ''}
                  index={index}
                  isActive={route.dex.id === activeDexId}
                  onSelect={onSelect}
                  locked={locked}
                />
              ))}
            </ul>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

type RouteRowProps = {
  route: QuoteRoute;
  toSymbol: string;
  index: number;
  isActive: boolean;
  onSelect: (id: DexId) => void;
  locked: boolean;
};

const RouteRow = ({
  route,
  toSymbol,
  index,
  isActive,
  onSelect,
  locked,
}: RouteRowProps) => {
  const isBest = route.rank === 0;
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
    >
      <button
        type="button"
        onClick={() => onSelect(route.dex.id)}
        disabled={locked}
        aria-pressed={isActive}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left',
          'transition-colors',
          'hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:bg-accent-soft/60',
          isActive && 'bg-accent-soft',
          'disabled:cursor-not-allowed',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'inline-block h-2.5 w-2.5 rounded-full shrink-0',
            isActive && 'ring-2 ring-offset-2 ring-offset-surface',
          )}
          style={{
            backgroundColor: route.dex.color,
            boxShadow: isActive ? `0 0 0 2px rgb(var(--color-accent) / 0.4)` : undefined,
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn('font-medium text-sm sm:text-base', isActive && 'text-ink-1')}>
              {route.dex.name}
            </span>
            {isBest && (
              <span className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                Best
              </span>
            )}
            {isActive && !isBest && (
              <span className="text-[10px] uppercase tracking-wider text-ink-2 font-semibold">
                Selected
              </span>
            )}
          </div>
          <div className="text-[11px] sm:text-xs text-ink-3 truncate">
            {route.dex.tagline} · fee {(route.dex.feeBps / 100).toFixed(2)}%
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono tabular text-xs sm:text-sm">
            {formatTokenAmount(route.expectedReceive)} {toSymbol}
          </div>
          <div
            className={cn(
              'font-mono tabular text-[11px] sm:text-xs',
              isBest ? 'text-ink-3' : 'text-negative',
            )}
          >
            {isBest ? `fee ${formatUsd(route.feeUsd)}` : formatPercent(route.deltaFromBest)}
          </div>
        </div>
      </button>
    </motion.li>
  );
};

const formatPercent = (fraction: number): string => {
  const pct = fraction * 100;
  if (Math.abs(pct) < 0.005) return '−0.00%';
  return `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}%`;
};
