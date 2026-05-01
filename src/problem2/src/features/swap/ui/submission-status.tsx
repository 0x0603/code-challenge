import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Modal } from '@/shared/ui';
import { formatTokenAmount, formatUsd, useToken } from '@/entities/token';
import { cn } from '@/shared/lib/cn';
import type { SwapReceipt, SwapSubmissionState } from '../lib/use-swap-submission';

type SubmissionStatusProps = {
  state: SwapSubmissionState;
  onDismiss: () => void;
};

/**
 * Renders the result of a Confirm click in three layers:
 *   - confirming: an inline pill below Confirm so the form context stays
 *     visible while we wait.
 *   - success / error: a Modal popup so the moment is unmissable. Real
 *     swaps move money; an inline confirmation is too easy to miss, and
 *     the modal forces an explicit acknowledgement.
 */
export const SubmissionStatus = ({ state, onDismiss }: SubmissionStatusProps) => {
  if (state.phase === 'idle') return null;

  return (
    <>
      {state.phase === 'confirming' && <ConfirmingPill state={state} />}
      <Modal
        open={state.phase === 'success' || state.phase === 'error'}
        onClose={onDismiss}
        title={state.phase === 'success' ? 'Swap submitted' : 'Swap failed'}
        widthClassName="max-w-[420px]"
      >
        {state.phase === 'success' && (
          <SuccessContent receipt={state.receipt} onDismiss={onDismiss} />
        )}
        {state.phase === 'error' && (
          <ErrorContent reason={state.reason} onDismiss={onDismiss} />
        )}
      </Modal>
    </>
  );
};

const ConfirmingPill = ({
  state,
}: {
  state: Extract<SwapSubmissionState, { phase: 'confirming' }>;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.16 }}
    className="mt-4 rounded-input border border-border-subtle bg-bg/50 px-4 py-3 text-sm text-ink-2"
  >
    Submitting{' '}
    <span className="font-mono tabular text-ink-1">
      {formatTokenAmount(state.receipt.pay)} {state.receipt.fromSymbol}
    </span>
    {' → '}
    <span className="font-mono tabular text-ink-1">
      {formatTokenAmount(state.receipt.receive)} {state.receipt.toSymbol}
    </span>
    <span className="text-ink-3">…</span>
  </motion.div>
);

const SuccessContent = ({
  receipt,
  onDismiss,
}: {
  receipt: SwapReceipt;
  onDismiss: () => void;
}) => {
  const fromToken = useToken(receipt.fromSymbol);
  const toToken = useToken(receipt.toSymbol);
  const payUsd = fromToken ? receipt.pay * fromToken.priceUsd : null;
  const receiveUsd = toToken ? receipt.receive * toToken.priceUsd : null;

  return (
    <div className="px-6 pt-7 pb-6">
      <div className="flex flex-col items-center text-center">
        <CheckBadge />
        <h2 className="display text-[28px] mt-5 leading-tight">Swap submitted</h2>
        <p className="text-sm text-ink-3 mt-1">Mocked confirmation — no real on-chain transaction.</p>
      </div>

      <div className="mt-6 rounded-input bg-bg/50 dark:bg-bg/30 border border-border-subtle px-4 py-4">
        <ReceiptLine
          label="You sent"
          amount={receipt.pay}
          symbol={receipt.fromSymbol}
          usd={payUsd}
        />
        <div
          aria-hidden
          className="my-3 flex items-center gap-2 text-ink-3 text-xs uppercase tracking-wider"
        >
          <span className="flex-1 h-px bg-border-subtle" />
          <DownArrow />
          <span className="flex-1 h-px bg-border-subtle" />
        </div>
        <ReceiptLine
          label="You received"
          amount={receipt.receive}
          symbol={receipt.toSymbol}
          usd={receiveUsd}
          highlight
        />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <DetailRow label="Routed via">
          <span className="font-medium text-ink-1">{receipt.routedVia}</span>
        </DetailRow>
        <DetailRow label="Transaction">
          <CopyableHash value={receipt.txId} />
        </DetailRow>
      </dl>

      <Button type="button" size="lg" fullWidth className="mt-6" onClick={onDismiss}>
        Done
      </Button>
    </div>
  );
};

const ErrorContent = ({
  reason,
  onDismiss,
}: {
  reason: string;
  onDismiss: () => void;
}) => (
  <div className="px-6 pt-7 pb-6">
    <div className="flex flex-col items-center text-center">
      <CrossBadge />
      <h2 className="display text-[28px] mt-5 leading-tight">Swap failed</h2>
      <p className="text-sm text-ink-2 mt-2 max-w-[280px]">{reason}</p>
    </div>
    <Button type="button" size="lg" fullWidth className="mt-6" onClick={onDismiss}>
      Try again
    </Button>
  </div>
);

const ReceiptLine = ({
  label,
  amount,
  symbol,
  usd,
  highlight = false,
}: {
  label: string;
  amount: number;
  symbol: string;
  usd: number | null;
  highlight?: boolean;
}) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-xs uppercase tracking-wider text-ink-3">{label}</span>
    <div className="text-right">
      <div
        className={cn(
          'font-mono tabular',
          highlight ? 'text-ink-1 text-base' : 'text-ink-2 text-sm',
        )}
      >
        {formatTokenAmount(amount)} {symbol}
      </div>
      {usd !== null && (
        <div className="text-xs text-ink-3 font-mono tabular">≈ {formatUsd(usd)}</div>
      )}
    </div>
  </div>
);

const DetailRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-ink-3">{label}</dt>
    <dd>{children}</dd>
  </div>
);

const CopyableHash = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently swallow, user can select manually */
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
        'font-mono tabular text-xs text-ink-2',
        'hover:bg-accent-soft hover:text-accent transition-colors',
      )}
      aria-label={copied ? 'Copied' : 'Copy transaction id'}
    >
      <span>{shortenHash(value)}</span>
      <span className="text-[10px] uppercase tracking-wider">
        {copied ? 'Copied' : 'Copy'}
      </span>
    </button>
  );
};

const shortenHash = (hash: string) => {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
};

const CheckBadge = () => (
  <motion.div
    initial={{ scale: 0.7, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
    className="relative inline-flex items-center justify-center"
  >
    <span className="absolute inset-0 rounded-full bg-accent-soft" />
    <span className="absolute inset-0 rounded-full bg-accent/10 animate-ping" />
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden
      className="relative"
    >
      <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="2" className="text-accent" />
      <motion.path
        d="M19 28.5l6 6L37 22"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.42, ease: 'easeOut', delay: 0.18 }}
      />
    </svg>
  </motion.div>
);

const CrossBadge = () => (
  <motion.div
    initial={{ scale: 0.7, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
    className="relative inline-flex items-center justify-center"
  >
    <span className="absolute inset-0 rounded-full bg-negative/10" />
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden
      className="relative text-negative"
    >
      <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="2" />
      <path
        d="M22 22l12 12m0-12L22 34"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  </motion.div>
);

const DownArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-ink-3">
    <path
      d="M12 5v14m0 0l-5-5m5 5l5-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
