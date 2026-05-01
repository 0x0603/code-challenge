/**
 * Number formatting helpers tuned for swap-form readability.
 *
 * - Token amounts: significant-figure based, so $0.000023 ETH and 12345 SHIB
 *   both render legibly without bespoke per-token rules.
 * - USD: standard locale formatting, but with sub-cent display when the
 *   amount is small enough that "$0.00" would lie about the value.
 */
const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });

export const formatTokenAmount = (amount: number, opts?: { maxDecimals?: number }): string => {
  if (!Number.isFinite(amount)) return '—';
  if (amount === 0) return '0';
  const max = opts?.maxDecimals ?? 6;

  // For very small numbers we want significant digits, not fixed decimals,
  // so 0.0000123 doesn't display as 0.000000.
  if (Math.abs(amount) < 1) {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: max,
      maximumSignificantDigits: 6,
    });
  }

  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(max, 4),
  });
};

export const formatUsd = (amount: number): string => {
  if (!Number.isFinite(amount)) return '—';
  if (amount === 0) return '$0.00';

  const abs = Math.abs(amount);
  if (abs < 0.01) {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumSignificantDigits: 1,
      maximumSignificantDigits: 2,
    });
  }
  if (abs >= 1_000_000) {
    return `$${compact.format(amount)}`;
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
