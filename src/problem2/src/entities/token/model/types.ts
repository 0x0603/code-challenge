import { z } from 'zod';

/**
 * Wire shape — a single price record from interview.switcheo.com/prices.json.
 * Validated at the network boundary so feature code can trust the runtime
 * shape matches the compile-time type.
 */
export const priceRecordSchema = z.object({
  currency: z.string().min(1),
  date: z.string().datetime(),
  price: z.number().finite().positive(),
});

export const priceFeedSchema = z.array(priceRecordSchema);

export type PriceRecord = z.infer<typeof priceRecordSchema>;

/**
 * Domain shape — what the rest of the app sees. We collapse the raw feed
 * (which can carry duplicate currencies) into one canonical token per
 * symbol and attach an icon URL, so feature code never has to reason about
 * how prices were fetched.
 */
export type Token = {
  readonly symbol: string;
  readonly priceUsd: number;
  readonly priceTakenAt: string;
  readonly iconUrl: string;
};
