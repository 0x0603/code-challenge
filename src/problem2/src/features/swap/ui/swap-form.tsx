import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatTokenAmount, mockBalance, useToken } from '@/entities/token';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { SwapRow } from './swap-row';
import { SwapDirectionButton } from './swap-direction-button';
import { RouteCompare } from './route-compare';
import { CountdownRing } from './countdown-ring';
import { SubmissionStatus } from './submission-status';
import { DealQualityCard } from './deal-quality-card';
import { buildSwapSchema, type SwapFormValues } from '../model/schema';
import { useExchangeRate } from '../lib/exchange-rate';
import { useRoutes } from '../lib/use-routes';
import { useSwapBinding } from '../lib/use-swap-binding';
import { useQuoteCountdown } from '../lib/use-quote-countdown';
import { useQuoteRefresh } from '../lib/use-quote-refresh';
import { useSwapSubmission } from '../lib/use-swap-submission';
import { useRateHistory } from '../lib/use-rate-history';
import { computeDealQuality } from '../lib/deal-quality';
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
 * Top-level swap form. Composes:
 *   - RHF state (string-typed values, validated lazily on submit)
 *   - useExchangeRate + useRoutes (best-route effective rate)
 *   - useSwapBinding (pay ↔ receive cross-update on every keystroke)
 *   - useQuoteCountdown (15s TTL ring; refetches the price feed on expire)
 *   - useSwapSubmission (idle → confirming → success/error reducer)
 *
 * Each hook owns one concern; this component is just composition + layout.
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
  // the pair changes — a user's preference for "AMM-DEX on the SWTH/ETH
  // pair" doesn't carry over to a different pair, where it might no
  // longer be available or sensible.
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

  const { setPay, setReceive } = useSwapBinding(form, effectiveRate);

  const refreshQuote = useQuoteRefresh();
  const { fraction: countdownFraction, remainingMs } = useQuoteCountdown({
    active: amountIn !== null && amountIn > 0,
    ttlMs: QUOTE_TTL_MS,
    onExpire: refreshQuote,
  });

  const { state: submission, submit, reset: resetSubmission } = useSwapSubmission();
  const isLocked = submission.phase === 'confirming' || submission.phase === 'success';

  const pairKey =
    fromSymbol && toSymbol ? `${fromSymbol}-${toSymbol}` : null;
  const rateHistory = useRateHistory(pairKey, midRate);

  const dealQuality = useMemo(() => {
    if (!activeRoute || !toToken || amountIn === null || amountIn <= 0) return null;
    return computeDealQuality({
      active: activeRoute,
      routes,
      midRate: midRate ?? activeRoute.effectiveRate,
      amountIn,
      toPriceUsd: toToken.priceUsd,
    });
  }, [activeRoute, routes, midRate, amountIn, toToken]);

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
  }, [resetSubmission, form]);

  const errors = form.formState.errors;
  const firstError =
    errors.payAmount?.message ??
    errors.toSymbol?.message ??
    errors.fromSymbol?.message;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn(
        'rounded-card bg-surface shadow-card border border-border-subtle p-6 sm:p-7',
        'transition-opacity',
        isLocked && 'opacity-95',
      )}
    >
      <fieldset disabled={isLocked} className="contents">
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

        <RatePreview
          fromSymbol={fromToken?.symbol}
          toSymbol={toToken?.symbol}
          rate={effectiveRate}
          activeDexName={activeRoute?.dex.name}
          isOverride={selectedDexId !== null && activeRoute?.rank !== 0}
          countdownActive={amountIn !== null && amountIn > 0}
          remainingMs={remainingMs}
        />

        {dealQuality && toToken ? (
          <DealQualityCard
            quality={dealQuality}
            history={rateHistory}
            toSymbol={toToken.symbol}
          />
        ) : null}

        <RouteCompare
          amountIn={amountIn}
          fromSymbol={fromSymbol}
          toSymbol={toSymbol}
          activeDexId={activeRoute?.dex.id ?? null}
          onSelect={setSelectedDexId}
          locked={isLocked}
        />

        {firstError ? (
          <p role="alert" className="mt-3 text-sm text-negative">
            {firstError}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submission.phase === 'confirming'}
          disabled={isLocked || !activeRoute}
          leftSlot={
            countdownFraction > 0 && submission.phase === 'idle' ? (
              <CountdownRing fraction={countdownFraction} />
            ) : null
          }
          className="mt-6"
        >
          {submission.phase === 'confirming'
            ? 'Submitting…'
            : submission.phase === 'success'
              ? 'Swap submitted'
              : 'Confirm swap'}
        </Button>
      </fieldset>

      <SubmissionStatus state={submission} onDismiss={handleDismissSubmission} />
    </form>
  );
};

const RatePreview = ({
  fromSymbol,
  toSymbol,
  rate,
  activeDexName,
  isOverride,
  countdownActive,
  remainingMs,
}: {
  fromSymbol: string | undefined;
  toSymbol: string | undefined;
  rate: number | null;
  activeDexName: string | undefined;
  isOverride: boolean;
  countdownActive: boolean;
  remainingMs: number;
}) => {
  if (!fromSymbol || !toSymbol || rate === null) {
    return (
      <div className="mt-5 text-sm text-ink-3 font-mono tabular text-center">
        Rate unavailable
      </div>
    );
  }
  return (
    <div className="mt-5 text-center text-sm">
      <div className="font-mono tabular text-ink-2">
        1 {fromSymbol} = {formatTokenAmount(rate)} {toSymbol}
      </div>
      <div className="text-xs text-ink-3 mt-1 flex items-center justify-center gap-2">
        {activeDexName ? (
          <span>
            via{' '}
            <span className={cn('font-medium', isOverride ? 'text-warning' : 'text-ink-2')}>
              {activeDexName}
            </span>
            {isOverride ? <span className="ml-1">(manual)</span> : null}
          </span>
        ) : null}
        {activeDexName && countdownActive ? <span aria-hidden>·</span> : null}
        {countdownActive ? (
          <span className="font-mono tabular">
            refreshes in {Math.ceil(remainingMs / 1000)}s
          </span>
        ) : null}
      </div>
    </div>
  );
};
