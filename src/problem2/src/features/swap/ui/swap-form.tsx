import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { mockBalance, useToken } from '@/entities/token';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { SwapRow } from './swap-row';
import { SwapDirectionButton } from './swap-direction-button';
import { RouteCompare } from './route-compare';
import { CountdownRing } from './countdown-ring';
import { SubmissionStatus } from './submission-status';
import { buildSwapSchema, type SwapFormValues } from '../model/schema';
import { useExchangeRate } from '../lib/exchange-rate';
import { useRoutes } from '../lib/use-routes';
import { useSwapBinding } from '../lib/use-swap-binding';
import { useQuoteCountdown } from '../lib/use-quote-countdown';
import { useQuoteRefresh } from '../lib/use-quote-refresh';
import { useSwapSubmission } from '../lib/use-swap-submission';
import { parseAmount, stringifyAmount } from '../lib/parse-amount';
import type { DexId } from '../lib/routes';

const DEFAULTS: SwapFormValues = {
  fromSymbol: 'SWTH',
  toSymbol: 'ETH',
  payAmount: '',
  receiveAmount: '',
};

const QUOTE_TTL_MS = 15_000;

/**
 * Top-level swap form. Composes the form rows and the quotes panel into a
 * two-column layout on desktop (form left, quotes right) inspired by the
 * Ledger swap experience. Below `lg` the quotes panel stacks underneath
 * the form.
 *
 * Each cross-cutting concern lives in its own hook (binding, routes,
 * countdown, submission) so this component is layout + composition.
 */
export const SwapForm = () => {
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
  const { rate: midRate } = useExchangeRate(fromSymbol, toSymbol);

  const amountIn = useMemo(() => parseAmount(payAmount), [payAmount]);
  const { routes, bestRoute } = useRoutes({ amountIn, fromSymbol, toSymbol });

  // Manual route override. Defaults to null (= use the best). Resets when
  // the pair changes — a user's preference for "1inch on the SWTH/ETH
  // pair" doesn't carry over to a different pair.
  const [selectedDexId, setSelectedDexId] = useState<DexId | null>(null);
  useEffect(() => {
    setSelectedDexId(null);
  }, [fromSymbol, toSymbol]);

  const activeRoute = useMemo(() => {
    if (!selectedDexId) return bestRoute;
    return routes.find((r) => r.dex.id === selectedDexId) ?? bestRoute;
  }, [routes, bestRoute, selectedDexId]);

  const effectiveRate = activeRoute?.effectiveRate ?? midRate;

  const payBalance = useMemo(
    () => (fromToken ? mockBalance(fromToken.symbol, fromToken.priceUsd) : 0),
    [fromToken],
  );

  const exceedsBalance = amountIn !== null && amountIn > 0 && amountIn > payBalance;

  const { setPay, setReceive } = useSwapBinding(form, effectiveRate);

  const refreshQuote = useQuoteRefresh();
  const { fraction: countdownFraction, remainingMs } = useQuoteCountdown({
    active: amountIn !== null && amountIn > 0,
    ttlMs: QUOTE_TTL_MS,
    onExpire: refreshQuote,
  });

  const { state: submission, submit, reset: resetSubmission } = useSwapSubmission();
  const isLocked = submission.phase === 'confirming' || submission.phase === 'success';

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
    if (!fromToken || !toToken || !activeRoute) return;
    submit({
      fromSymbol: values.fromSymbol ?? '',
      toSymbol: values.toSymbol ?? '',
      pay: parseAmount(values.payAmount) ?? 0,
      receive: activeRoute.expectedReceive,
      routedVia: activeRoute.dex.name,
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

  const handleDismissSubmission = useCallback(() => {
    resetSubmission();
    form.reset(DEFAULTS);
    setSelectedDexId(null);
  }, [resetSubmission, form]);

  const errors = form.formState.errors;
  const firstError =
    errors.payAmount?.message ??
    errors.toSymbol?.message ??
    errors.fromSymbol?.message;

  const countdownActive = amountIn !== null && amountIn > 0;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)] gap-6 items-start"
      >
        <fieldset
          disabled={isLocked}
          className={cn(
            'rounded-card bg-surface shadow-card border border-border-subtle p-5 sm:p-6',
            'transition-opacity',
            isLocked && 'opacity-95',
          )}
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
              balanceExceeded={exceedsBalance}
              trailing={
                <button
                  type="button"
                  onClick={handleMax}
                  className="text-accent hover:underline font-medium tracking-wide disabled:opacity-50"
                  disabled={isLocked}
                >
                  Max
                </button>
              }
            />
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center pointer-events-none">
              <div className="pointer-events-auto">
                <SwapDirectionButton
                  onClick={flip}
                  disabled={!fromToken || !toToken || isLocked}
                />
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

          {firstError ? (
            <p role="alert" className="mt-4 text-sm text-negative">
              {firstError}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={submission.phase === 'confirming'}
            disabled={isLocked || !activeRoute || exceedsBalance}
            leftSlot={
              countdownFraction > 0 &&
              submission.phase === 'idle' &&
              !exceedsBalance ? (
                <CountdownRing fraction={countdownFraction} />
              ) : null
            }
            className="mt-5"
          >
            {submission.phase === 'confirming'
              ? 'Submitting…'
              : submission.phase === 'success'
                ? 'Swap submitted'
                : exceedsBalance
                  ? 'Insufficient balance'
                  : 'Confirm swap'}
          </Button>
        </fieldset>

        <RouteCompare
          amountIn={amountIn}
          fromSymbol={fromSymbol}
          toSymbol={toSymbol}
          activeDexId={activeRoute?.dex.id ?? null}
          onSelect={setSelectedDexId}
          locked={isLocked}
          remainingMs={remainingMs}
          countdownActive={countdownActive}
          onPickMarketToken={handleToChange}
        />
      </form>

      <SubmissionStatus state={submission} onDismiss={handleDismissSubmission} />
    </>
  );
};
