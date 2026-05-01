/**
 * Number formatting helpers tuned for swap-form readability.
 *
 * - Token amounts: significant-figure based with Uniswap-style subscript
 *   notation for tiny values, so 0.00000245322 reads as "0.0₅2453"
 *   instead of a long string of zeros that the eye can't parse.
 * - USD: standard locale formatting, but with sub-cent display when the
 *   amount is small enough that "$0.00" would lie about the value.
 */
const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });

const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
const toSubscript = (n: number): string =>
  String(n)
    .split('')
    .map((d) => SUBSCRIPT_DIGITS[Number(d)] ?? d)
    .join('');

/**
 * Threshold below which subscript notation kicks in. At 0.0001 the plain
 * "0.0001" form is still legible; below that, the eye starts losing count
 * of zeros, so we collapse them.
 */
const SUBSCRIPT_THRESHOLD = 1e-4;

export type FormatAmountOptions = {
  /**
   * Number of significant digits to keep in the display. Default 4 — a
   * sweet spot that reads well at typical font sizes without aliasing
   * the rate.
   */
  sigFigs?: number;
};

export const formatTokenAmount = (amount: number, opts?: FormatAmountOptions): string => {
  if (!Number.isFinite(amount)) return '—';
  if (amount === 0) return '0';

  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const sigFigs = opts?.sigFigs ?? 4;

  // Sub-threshold values get the compact subscript form. The leading-zero
  // count is computed from the exponent, then we round the leading
  // significant digits separately so display "0.0₅2453" stays consistent
  // regardless of where the decimal would have been.
  if (abs < SUBSCRIPT_THRESHOLD) {
    const exponent = Math.floor(Math.log10(abs));
    const leadingZeros = -exponent - 1;
    const scaled = abs / Math.pow(10, exponent);
    const rounded = Number(scaled.toPrecision(sigFigs));
    const digits = String(rounded).replace('.', '').replace(/0+$/, '') || '0';
    return `${sign}0.0${toSubscript(leadingZeros)}${digits}`;
  }

  if (abs < 1) {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumSignificantDigits: sigFigs,
    });
  }

  if (abs >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumSignificantDigits: sigFigs,
    }).format(amount);
  }

  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
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
