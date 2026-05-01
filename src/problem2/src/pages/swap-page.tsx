import { useState } from 'react';
import { TokenSelect } from '@/features/swap';

/**
 * Page shell — for M3 the SwapForm is still a placeholder, but the two
 * TokenSelect chips already exercise the modal, recent-tokens persistence,
 * and the mutual-disable rule (you can't pick the same token on both
 * sides). The full form lands in M4.
 */
export const SwapPage = () => {
  const [fromSymbol, setFromSymbol] = useState<string | null>('SWTH');
  const [toSymbol, setToSymbol] = useState<string | null>('ETH');

  return (
    <main className="min-h-dvh flex flex-col items-center px-4 pt-16 pb-24">
      <header className="w-full max-w-[520px] flex items-center justify-between mb-12">
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-accent" />
          <span className="font-medium tracking-tight">FlowSwap</span>
        </div>
        <span className="text-xs text-ink-3 font-mono">v0.3 · token select</span>
      </header>

      <section className="w-full max-w-[520px]">
        <h1 className="display text-[56px] leading-none mb-2">Swap</h1>
        <p className="text-ink-2 mb-10">
          Compare routes across mock DEXes, see how the deal stacks up against the market,
          and confirm before the quote expires.
        </p>

        <div className="rounded-card bg-surface shadow-card border border-border-subtle p-6 space-y-4">
          <TokenSelectRow
            label="You pay"
            value={fromSymbol}
            onChange={setFromSymbol}
            disabled={toSymbol ? [toSymbol] : []}
          />
          <TokenSelectRow
            label="You receive"
            value={toSymbol}
            onChange={setToSymbol}
            disabled={fromSymbol ? [fromSymbol] : []}
          />
          <p className="text-xs text-ink-3 mt-6">
            Smoke test for M3 — recent tokens persist across reload, the other side is
            disabled to prevent same-token swaps. SwapForm with amounts and validation
            ships in M4.
          </p>
        </div>
      </section>
    </main>
  );
};

const TokenSelectRow = ({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (s: string) => void;
  disabled: readonly string[];
}) => (
  <div className="flex items-center justify-between rounded-input bg-bg/50 px-4 py-4 border border-border-subtle">
    <span className="text-sm text-ink-2">{label}</span>
    <TokenSelect value={value} onChange={onChange} disabledSymbols={disabled} ariaLabel={label} />
  </div>
);
