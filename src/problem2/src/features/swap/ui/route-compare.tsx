import { AnimatePresence, motion } from 'framer-motion';
import { formatTokenAmount, formatUsd } from '@/entities/token';
import { cn } from '@/shared/lib/cn';
import { useRoutes } from '../lib/use-routes';
import type { QuoteRoute } from '../lib/routes';

type RouteCompareProps = {
  amountIn: number | null;
  fromSymbol: string | null;
  toSymbol: string | null;
};

/**
 * Ranks the available DEX routes for the current swap and renders them
 * as a list with the best one highlighted. The panel hides itself when
 * there's nothing meaningful to compare (no amount or no pair) so the
 * empty form stays calm.
 *
 * The list is the M5 minimum-viable signature feature. M6 layers in the
 * countdown and live refresh; M7 reads a "deal quality" score from the
 * same `routes` array so the same data drives multiple views.
 */
export const RouteCompare = ({
  amountIn,
  fromSymbol,
  toSymbol,
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
                Best of {routes.length}
              </span>
            </header>
            <ul className="divide-y divide-border-subtle">
              {routes.map((route, index) => (
                <RouteRow
                  key={route.dex.id}
                  route={route}
                  toSymbol={toSymbol ?? ''}
                  index={index}
                />
              ))}
            </ul>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

const RouteRow = ({
  route,
  toSymbol,
  index,
}: {
  route: QuoteRoute;
  toSymbol: string;
  index: number;
}) => {
  const isBest = route.rank === 0;
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        isBest && 'bg-accent-soft/50',
      )}
    >
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: route.dex.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn('font-medium', isBest && 'text-ink-1')}>
            {route.dex.name}
          </span>
          {isBest && (
            <span className="text-[10px] uppercase tracking-wider text-accent font-semibold">
              Best
            </span>
          )}
        </div>
        <div className="text-xs text-ink-3 truncate">
          {route.dex.tagline} · fee {(route.dex.feeBps / 100).toFixed(2)}% ·
          slippage {(route.slippage * 100).toFixed(3)}%
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono tabular text-sm">
          {formatTokenAmount(route.expectedReceive)} {toSymbol}
        </div>
        <div
          className={cn(
            'font-mono tabular text-xs',
            isBest ? 'text-ink-3' : 'text-negative',
          )}
        >
          {isBest ? `fee ${formatUsd(route.feeUsd)}` : formatPercent(route.deltaFromBest)}
        </div>
      </div>
    </motion.li>
  );
};

const formatPercent = (fraction: number): string => {
  const pct = fraction * 100;
  if (Math.abs(pct) < 0.005) return '−0.00%';
  return `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}%`;
};
