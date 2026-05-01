import { useCallback, useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { SwapFormValues } from '../model/schema';
import { parseAmount, sanitizeAmountInput, stringifyAmount } from './parse-amount';

/**
 * Bidirectional binding between the pay and receive amount fields.
 *
 * The naive approach — using `watch()` on both fields and reacting in
 * effects — produces feedback loops (typing in pay updates receive,
 * which fires the receive watcher, which writes back to pay). Instead we
 * route every user-driven change through the explicit setters returned
 * here, and use a single effect to recompute the *other* side when the
 * exchange rate changes (e.g. on token swap).
 */
export const useSwapBinding = (
  form: UseFormReturn<SwapFormValues>,
  rate: number | null,
) => {
  const setPay = useCallback(
    (raw: string) => {
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

  // When the rate moves under us — user picks a different token, prices
  // refresh — keep the pay amount as the source of truth and recompute
  // the receive amount. We don't write back to pay; that would surprise a
  // user mid-typing.
  useEffect(() => {
    if (rate === null) return;
    const value = parseAmount(form.getValues('payAmount'));
    if (value === null) return;
    form.setValue('receiveAmount', stringifyAmount(value * rate));
  }, [rate, form]);

  return { setPay, setReceive };
};
