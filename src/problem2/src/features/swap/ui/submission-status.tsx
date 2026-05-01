import { motion } from 'framer-motion';
import { Button } from '@/shared/ui';
import { formatTokenAmount } from '@/entities/token';
import type { SwapSubmissionState } from '../lib/use-swap-submission';

type SubmissionStatusProps = {
  state: SwapSubmissionState;
  onDismiss: () => void;
};

/**
 * Renders the inline result of a Confirm click — a small status card
 * below the button that flips between confirming, success, and error.
 * Lives outside the form fields so a dismissed result resets cleanly.
 */
export const SubmissionStatus = ({ state, onDismiss }: SubmissionStatusProps) => {
  if (state.phase === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="mt-4"
    >
      {state.phase === 'confirming' && (
        <div className="rounded-input border border-border-subtle bg-bg/50 px-4 py-3 text-sm text-ink-2">
          Submitting{' '}
          <span className="font-mono tabular text-ink-1">
            {formatTokenAmount(state.receipt.pay)} {state.receipt.fromSymbol}
          </span>
          {' → '}
          <span className="font-mono tabular text-ink-1">
            {formatTokenAmount(state.receipt.receive)} {state.receipt.toSymbol}
          </span>
          …
        </div>
      )}

      {state.phase === 'success' && (
        <div className="rounded-input border border-accent/30 bg-accent-soft px-4 py-3">
          <div className="flex items-start gap-3">
            <CheckGlyph />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-accent">Swap submitted</p>
              <p className="text-sm text-ink-2 mt-1 font-mono tabular">
                {formatTokenAmount(state.receipt.pay)} {state.receipt.fromSymbol} →{' '}
                {formatTokenAmount(state.receipt.receive)} {state.receipt.toSymbol}
              </p>
              <p className="text-xs text-ink-3 mt-1 font-mono truncate">
                tx {state.receipt.txId}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Done
            </Button>
          </div>
          <p className="text-[11px] text-ink-3 mt-2">
            Mocked — no real on-chain transaction. Receipt resets when you dismiss.
          </p>
        </div>
      )}

      {state.phase === 'error' && (
        <div className="rounded-input border border-negative/30 bg-negative/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <CrossGlyph />
            <div className="flex-1">
              <p className="text-sm font-medium text-negative">Swap failed</p>
              <p className="text-sm text-ink-2 mt-1">{state.reason}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {state.phase === 'success' && (
        <p className="mt-3 text-xs text-ink-3 text-center">
          Quote ages once finished — it will refetch on dismiss.
        </p>
      )}
    </motion.div>
  );
};

const CheckGlyph = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className="shrink-0 mt-0.5 text-accent"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 12.5l2.5 2.5L16 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CrossGlyph = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className="shrink-0 mt-0.5 text-negative"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M9 9l6 6m0-6l-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
