import { type ReactNode } from 'react';
import { formatTokenAmount, formatUsd, type Token } from '@/entities/token';
import { cn } from '@/shared/lib/cn';
import { TokenSelect } from './token-select';
import { AmountInput } from './amount-input';
import { parseAmount } from '../lib/parse-amount';

type SwapRowProps = {
  label: string;
  amount: string;
  onAmountChange: (raw: string) => void;
  selectedSymbol: string | null;
  onSymbolChange: (symbol: string) => void;
  disabledSymbols: readonly string[];
  token: Token | undefined;
  balance?: number;
  /** Inline action rendered above the amount (e.g. Max button on pay row). */
  trailing?: ReactNode;
  /** Read-only: receive row doesn't show balance/Max chips. */
  readOnly?: boolean;
};

/**
 * One half of the swap form (pay row or receive row). Composes the amount
 * input with the token chip and the supporting context (USD value, mock
 * balance) that turns a bare number into a swap.
 *
 * The component is presentational — value flows in from RHF in the parent
 * and the parent owns validation. Keeping it dumb lets us reuse the row
 * layout for any "amount + token" surface (limit orders, etc.) later.
 */
export const SwapRow = ({
  label,
  amount,
  onAmountChange,
  selectedSymbol,
  onSymbolChange,
  disabledSymbols,
  token,
  balance,
  trailing,
  readOnly = false,
}: SwapRowProps) => {
  const numericAmount = parseAmount(amount);
  const usdValue =
    numericAmount !== null && token ? numericAmount * token.priceUsd : null;

  return (
    <div className="rounded-input bg-bg/50 dark:bg-bg/30 border border-border-subtle px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-ink-3">
          {label}
        </span>
        {!readOnly && balance !== undefined ? (
          <span className="text-xs text-ink-3 font-mono tabular">
            Balance {formatTokenAmount(balance)}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <AmountInput
            value={amount}
            onChange={onAmountChange}
            aria-label={`${label} amount`}
          />
        </div>
        <TokenSelect
          value={selectedSymbol}
          onChange={onSymbolChange}
          disabledSymbols={disabledSymbols}
          ariaLabel={`${label} token`}
        />
      </div>
      <div
        className={cn(
          'flex items-center justify-between mt-2 text-xs text-ink-3 font-mono tabular',
          'min-h-[18px]',
        )}
      >
        <span>{usdValue !== null ? `≈ ${formatUsd(usdValue)}` : ''}</span>
        {trailing}
      </div>
    </div>
  );
};
