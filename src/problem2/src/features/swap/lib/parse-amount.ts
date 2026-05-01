/**
 * Permissive numeric parsing for the swap amount inputs.
 *
 * The input element is a text field, not a `<input type="number">`, because
 * the latter has cross-locale quirks (comma vs dot decimals, mobile virtual
 * keyboards that don't expose a decimal key). We accept what users type and
 * normalize to a plain number ourselves:
 *
 *   - empty, "."  →  null  (no numeric meaning yet — keep "—" in the UI)
 *   - "12,345.67" →  12345.67
 *   - "1.2.3"     →  null  (caller blocks this on input)
 */
export const parseAmount = (raw: string): number | null => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '.' || trimmed === '-') return null;
  const stripped = trimmed.replace(/,/g, '');
  if (!/^-?\d*\.?\d*$/.test(stripped)) return null;
  const value = Number.parseFloat(stripped);
  return Number.isFinite(value) ? value : null;
};

/**
 * onChange filter for the amount inputs: silently drop characters that
 * aren't part of a decimal number. Keeps the cursor experience predictable
 * (typing a letter doesn't trigger a flash of state) without an aggressive
 * pattern attribute.
 */
export const sanitizeAmountInput = (raw: string): string => {
  // allow digits, one dot, optional leading minus, no whitespace
  let out = raw.replace(/[^0-9.]/g, '');
  const firstDot = out.indexOf('.');
  if (firstDot !== -1) {
    out = out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, '');
  }
  return out;
};

const MAX_DECIMALS = 9;

/**
 * Convert a number back to an input-friendly string. We don't pad zeros or
 * over-format — the goal is "what would a user type to mean this value".
 *
 * Significant-digit truncation prevents 0.1 + 0.2 = 0.30000000000000004
 * from leaking out of the cross-binding. The fractional part is then capped
 * at `MAX_DECIMALS` characters (default 9) so the receive amount never
 * grows wider than the input element can comfortably show.
 *
 * For very small magnitudes (< 1e-4) we use `toFixed` so the result stays
 * in plain decimal form — `toPrecision` switches to scientific notation
 * past 1e-7 and "1.23e-9" would not parse back through `parseAmount`.
 */
export const stringifyAmount = (
  value: number,
  opts?: { maxDecimals?: number },
): string => {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return '0';

  const maxDecimals = opts?.maxDecimals ?? MAX_DECIMALS;
  const abs = Math.abs(value);

  let str: string;
  if (abs < 1e-4) {
    str = value.toFixed(maxDecimals);
  } else if (abs < 1) {
    str = value.toPrecision(6);
  } else {
    str = value.toPrecision(8);
  }

  // Bail out if scientific notation slipped through (very large/small).
  if (str.includes('e')) {
    str = value.toFixed(maxDecimals);
  }

  if (str.includes('.')) {
    const [intPart, fracPart = ''] = str.split('.');
    const trimmedFrac = fracPart.slice(0, maxDecimals).replace(/0+$/, '');
    str = trimmedFrac ? `${intPart}.${trimmedFrac}` : intPart!;
  }

  return str;
};
