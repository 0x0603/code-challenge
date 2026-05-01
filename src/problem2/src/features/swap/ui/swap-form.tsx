import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  formatTokenAmount,
  mockBalance,
  useToken,
} from '@/entities/token';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { SwapRow } from './swap-row';
import { SwapDirectionButton } from './swap-direction-button';
import { buildSwapSchema, type SwapFormValues } from '../model/schema';
import { useExchangeRate } from '../lib/exchange-rate';
import { useSwapBinding } from '../lib/use-swap-binding';
import { parseAmount, stringifyAmount } from '../lib/parse-amount';

const DEFAULTS: SwapFormValues = {
  fromSymbol: 'SWTH',
  toSymbol: 'ETH',
  payAmount: '',
  receiveAmount: '',
};

/**
 * The top-level swap form. Composes:
 *   - RHF state (string-typed values, validated lazily on submit)
 *   - useExchangeRate (rate from price feed)
 *   - useSwapBinding (pay ↔ receive cross-update)
 *   - SwapRow x2 + SwapDirectionButton
 *
 * M5 will replace the fake submit with a quote engine; M6 wraps Confirm
 * in a state machine with a countdown. For M4 we surface the resolved
 * pair, rate, mock balance, and a Confirm gated by the schema.
 */
export const SwapForm = () => {
  const [submitted, setSubmitted] = useState<{
    fromSymbol: string;
    toSymbol: string;
    pay: number;
    receive: number;
  } | null>(null);

  // The RHF form holds raw string values so users can type partial inputs
  // ("12.") without our validator coercing them to NaN mid-keystroke.
  const form = useForm<SwapFormValues>({
    defaultValues: DEFAULTS,
    mode: 'onSubmit',
  });

  const fromSymbol = form.watch('fromSymbol');
  const toSymbol = form.watch('toSymbol');
  const payAmount = form.watch('payAmount');
  const receiveAmount = form.watch('receiveAmount');

  const fromToken = useToken(fromSymbol);
  const toToken = useToken(toSymbol);
  const { rate } = useExchangeRate(fromSymbol, toSymbol);

  const payBalance = useMemo(
    () => (fromToken ? mockBalance(fromToken.symbol, fromToken.priceUsd) : 0),
    [fromToken],
  );

  const { setPay, setReceive } = useSwapBinding(form, rate);

  // Wire validation context (balance) only at submit time. Doing it here
  // keeps the schema referentially stable across renders so RHF doesn't
  // re-resolve on every input keystroke.
  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    const schema = buildSwapSchema({ payBalance });
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === 'string') {
          form.setError(path as keyof SwapFormValues, { message: issue.message });
        }
      }
      return;
    }
    const pay = parseAmount(values.payAmount) ?? 0;
    const receive = parseAmount(values.receiveAmount) ?? 0;
    setSubmitted({
      fromSymbol: values.fromSymbol ?? '',
      toSymbol: values.toSymbol ?? '',
      pay,
      receive,
    });
  });

  const flip = useCallback(() => {
    const values = form.getValues();
    form.reset(
      {
        fromSymbol: values.toSymbol,
        toSymbol: values.fromSymbol,
        payAmount: values.receiveAmount,
        receiveAmount: values.payAmount,
      },
      { keepErrors: false },
    );
  }, [form]);

  const handleMax = useCallback(() => {
    setPay(stringifyAmount(payBalance));
  }, [setPay, payBalance]);

  const handleFromChange = useCallback(
    (next: string) => form.setValue('fromSymbol', next),
    [form],
  );
  const handleToChange = useCallback(
    (next: string) => form.setValue('toSymbol', next),
    [form],
  );

  const errors = form.formState.errors;
  const firstError =
    errors.payAmount?.message ??
    errors.toSymbol?.message ??
    errors.fromSymbol?.message;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-card bg-surface shadow-card border border-border-subtle p-6 sm:p-7"
    >
      <div className="relative space-y-2">
        <SwapRow
          label="You pay"
          amount={payAmount}
          onAmountChange={setPay}
          selectedSymbol={fromSymbol}
          onSymbolChange={handleFromChange}
          disabledSymbols={toSymbol ? [toSymbol] : []}
          token={fromToken}
          balance={payBalance}
          trailing={
            <button
              type="button"
              onClick={handleMax}
              className="text-accent hover:underline font-medium tracking-wide"
            >
              Max
            </button>
          }
        />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center pointer-events-none">
          <div className="pointer-events-auto">
            <SwapDirectionButton onClick={flip} disabled={!fromToken || !toToken} />
          </div>
        </div>
        <SwapRow
          label="You receive"
          amount={receiveAmount}
          onAmountChange={setReceive}
          selectedSymbol={toSymbol}
          onSymbolChange={handleToChange}
          disabledSymbols={fromSymbol ? [fromSymbol] : []}
          token={toToken}
          readOnly
        />
      </div>

      <RatePreview
        fromSymbol={fromToken?.symbol}
        toSymbol={toToken?.symbol}
        rate={rate}
      />

      {firstError ? (
        <p
          role="alert"
          className="mt-3 text-sm text-negative"
        >
          {firstError}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        fullWidth
        className="mt-6"
      >
        Confirm swap
      </Button>

      {submitted ? (
        <p className="mt-4 text-sm text-ink-2 text-center">
          Submitted: {formatTokenAmount(submitted.pay)} {submitted.fromSymbol} →{' '}
          {formatTokenAmount(submitted.receive)} {submitted.toSymbol}
          <span className="block text-xs text-ink-3 mt-1">
            (Quote lifecycle and confirmation flow ship in M6.)
          </span>
        </p>
      ) : null}
    </form>
  );
};

const RatePreview = ({
  fromSymbol,
  toSymbol,
  rate,
}: {
  fromSymbol: string | undefined;
  toSymbol: string | undefined;
  rate: number | null;
}) => {
  if (!fromSymbol || !toSymbol || rate === null) {
    return (
      <div className={cn('mt-5 text-sm text-ink-3 font-mono tabular text-center')}>
        Rate unavailable
      </div>
    );
  }
  return (
    <div className="mt-5 text-sm text-ink-2 font-mono tabular text-center">
      1 {fromSymbol} = {stringifyAmount(rate)} {toSymbol}
    </div>
  );
};
