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

/**
 * Convert a number back to an input-friendly string. We don't pad zeros or
 * over-format — the goal is "what would a user type to mean this value".
 * Significant-digit truncation prevents 0.1 + 0.2 = 0.30000000000000004
 * from leaking out of the cross-binding.
 */
export const stringifyAmount = (value: number): string => {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return '0';
  // toPrecision then trim trailing zeros — "0.0234" not "0.023400"
  const precision = Math.abs(value) < 1 ? 6 : 8;
  const fixed = value.toPrecision(precision);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/\.?0+$/, '');
};
