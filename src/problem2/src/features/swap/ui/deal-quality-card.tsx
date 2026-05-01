import { motion } from 'framer-motion';
import { formatTokenAmount, formatUsd } from '@/entities/token';
import { cn } from '@/shared/lib/cn';
import type { DealQuality } from '../lib/deal-quality';
import type { RateHistory } from '../lib/use-rate-history';

type DealQualityCardProps = {
  quality: DealQuality;
  history: RateHistory;
  toSymbol: string;
};

/**
 * The "is this a good deal" card. Three angles:
 *   1. Quality bar — where the active rate sits between worst and best
 *      route. A glance-readable visualization of "are you on the optimal
 *      route?" without having to compare numbers manually.
 *   2. Spot gap — the cost of fees + slippage vs the theoretical
 *      mid-rate. Reads in plain percent.
 *   3. Trend — how the rate has moved since the user opened this pair
 *      this session. Gives temporal context that mid-rate alone can't.
 *
 * The component is presentational — both inputs are pre-computed by
 * pure helpers (`computeDealQuality`, `useRateHistory`).
 */
export const DealQualityCard = ({
  quality,
  history,
  toSymbol,
}: DealQualityCardProps) => {
  const positionPct = Math.round(quality.rangePosition * 100);
  const spotGapPct = quality.spotGap * 100;
  const trendPct = history.deltaFraction !== null ? history.deltaFraction * 100 : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
      className="mt-4 rounded-input border border-border-subtle bg-bg/40 dark:bg-bg/20 px-4 py-3"
      aria-label="Deal quality"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-ink-3 mb-2">
        <span>Deal quality</span>
        <span className="font-mono tabular text-ink-2 normal-case tracking-normal">
          {positionPct}% of best
        </span>
      </div>

      <QualityBar position={quality.rangePosition} />

      <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <Stat
          label="Saved vs worst"
          value={
            quality.savingsVsWorst > 0
              ? `${formatTokenAmount(quality.savingsVsWorst)} ${toSymbol}`
              : '—'
          }
          sub={quality.savingsUsd > 0 ? formatUsd(quality.savingsUsd) : null}
        />
        <Stat
          label="Under spot"
          value={`−${spotGapPct.toFixed(2)}%`}
          tone={spotGapPct > 1 ? 'warning' : 'neutral'}
        />
        <Stat
          label="Since you opened"
          value={trendPct === null ? '—' : formatSignedPct(trendPct)}
          tone={trendPct === null ? 'neutral' : trendPct >= 0 ? 'positive' : 'warning'}
        />
      </dl>
    </motion.section>
  );
};

const QualityBar = ({ position }: { position: number }) => (
  <div
    className="relative h-1.5 rounded-full bg-border-subtle overflow-hidden"
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(position * 100)}
  >
    <motion.div
      className="absolute inset-y-0 left-0 bg-accent rounded-full"
      initial={false}
      animate={{ width: `${position * 100}%` }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
    />
  </div>
);

const Stat = ({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string | null;
  tone?: 'neutral' | 'positive' | 'warning';
}) => (
  <div>
    <dt className="text-ink-3 leading-tight">{label}</dt>
    <dd
      className={cn(
        'font-mono tabular leading-tight mt-0.5',
        tone === 'positive' && 'text-positive',
        tone === 'warning' && 'text-warning',
        tone === 'neutral' && 'text-ink-1',
      )}
    >
      {value}
    </dd>
    {sub ? <dd className="text-ink-3 font-mono tabular text-[11px]">{sub}</dd> : null}
  </div>
);

const formatSignedPct = (pct: number): string => {
  if (Math.abs(pct) < 0.005) return '±0.00%';
  return `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}%`;
};
