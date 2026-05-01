/**
 * Mock-wallet balance generator.
 *
 * Real wallets are out of scope for this challenge, but a static "Balance: 0"
 * everywhere makes the form feel dead. Instead we derive a deterministic
 * pseudo-balance from the token symbol so the same token always shows the
 * same number across renders, and different tokens visibly differ.
 *
 * The amount is shaped by the USD price so a unit balance feels plausible:
 *   - cheap tokens (price < $1) get larger token counts
 *   - expensive tokens (ETH, etc.) get fractional counts
 * That way "Balance: 0.8 ETH" reads as believable instead of "Balance: 12345 ETH".
 */
const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
};

export const mockBalance = (symbol: string, priceUsd: number): number => {
  const seed = fnv1a(symbol);
  // 0..1 deterministic factor
  const factor = (seed % 10_000) / 10_000;
  // target ~ $50 to $5000 worth of token, then scale by price
  const targetUsd = 50 + factor * 4_950;
  const amount = targetUsd / priceUsd;
  // round to 4 significant figures so the number reads cleanly
  return Number(amount.toPrecision(4));
};
