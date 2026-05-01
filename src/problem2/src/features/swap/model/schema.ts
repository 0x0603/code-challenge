import { z } from 'zod';
import { parseAmount } from '../lib/parse-amount';

/**
 * Form values are stored as strings (matching the raw input), with parsing
 * deferred to validation time. This lets the user type freely without RHF
 * fighting their cursor or coercing partial inputs to NaN.
 */
export type SwapFormValues = {
  fromSymbol: string | null;
  toSymbol: string | null;
  payAmount: string;
  receiveAmount: string;
};

export type SwapValidationContext = {
  /** Mock balance of the `from` token, in token units. */
  payBalance: number;
};

/**
 * Validation runs at submit time, not on every keystroke — typing "1.2." on
 * the way to "1.23" must not flash an error in the user's face. The form
 * UI shows soft messages (insufficient balance) live and uses this schema
 * only to gate Confirm.
 */
export const buildSwapSchema = (ctx: SwapValidationContext) =>
  z
    .object({
      fromSymbol: z.string().min(1, 'Pick a token to send.'),
      toSymbol: z.string().min(1, 'Pick a token to receive.'),
      payAmount: z.string(),
      receiveAmount: z.string(),
    })
    .refine((values) => values.fromSymbol !== values.toSymbol, {
      message: 'Pick two different tokens.',
      path: ['toSymbol'],
    })
    .refine(
      (values) => {
        const amount = parseAmount(values.payAmount);
        return amount !== null && amount > 0;
      },
      { message: 'Enter an amount greater than zero.', path: ['payAmount'] },
    )
    .refine(
      (values) => {
        const amount = parseAmount(values.payAmount);
        return amount === null || amount <= ctx.payBalance;
      },
      { message: 'Insufficient balance.', path: ['payAmount'] },
    );
