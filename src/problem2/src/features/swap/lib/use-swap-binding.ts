import { useCallback, useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { SwapFormValues } from '../model/schema';
import { parseAmount, sanitizeAmountInput, stringifyAmount } from './parse-amount';

/**
 * Bidirectional binding between the pay and receive amount fields.
 *
 * The naive two-way approach — using `watch()` on both fields and reacting
 * in effects — produces feedback loops: typing 5 in receive updates pay,
 * which on the next render with a recomputed best-route rate triggers a
 * write back to receive. Each pass loses a small amount of precision and
 * the displayed value drifts away from what the user typed.
 *
 * The fix is to remember which side the user last edited. Every time the
 * rate changes (e.g. quote refresh, token change, route override), the
 * effect recomputes only the *other* side, leaving the user's input
 * untouched. The setters re-anchor the active side, so a flip from
 * "I want to send X" to "I want to receive Y" works without churn.
 */
export const useSwapBinding = (
  form: UseFormReturn<SwapFormValues>,
  rate: number | null,
) => {
  const lastEditedRef = useRef<'pay' | 'receive'>('pay');

  const setPay = useCallback(
    (raw: string) => {
      lastEditedRef.current = 'pay';
      const sanitized = sanitizeAmountInput(raw);
      form.setValue('payAmount', sanitized);
      form.clearErrors('payAmount');
      const value = parseAmount(sanitized);
      if (value === null || rate === null) {
        form.setValue('receiveAmount', '');
        return;
      }
      form.setValue('receiveAmount', stringifyAmount(value * rate));
    },
    [form, rate],
  );

  const setReceive = useCallback(
    (raw: string) => {
      lastEditedRef.current = 'receive';
      const sanitized = sanitizeAmountInput(raw);
      form.setValue('receiveAmount', sanitized);
      form.clearErrors('payAmount');
      const value = parseAmount(sanitized);
      if (value === null || rate === null) {
        form.setValue('payAmount', '');
        return;
      }
      form.setValue('payAmount', stringifyAmount(value / rate));
    },
    [form, rate],
  );

  // Rate changes during a session: token select, route override, quote
  // refresh. Recompute the *other* side from the side the user last
  // edited so their input value stays exactly as typed.
  useEffect(() => {
    if (rate === null) return;
    if (lastEditedRef.current === 'pay') {
      const value = parseAmount(form.getValues('payAmount'));
      if (value === null) return;
      form.setValue('receiveAmount', stringifyAmount(value * rate));
    } else {
      const value = parseAmount(form.getValues('receiveAmount'));
      if (value === null) return;
      form.setValue('payAmount', stringifyAmount(value / rate));
    }
  }, [rate, form]);

  return { setPay, setReceive };
};
