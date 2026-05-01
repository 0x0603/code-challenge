import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

type AmountInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: string;
  onChange: (raw: string) => void;
};

/**
 * The hero numeric input. Renders in the editorial display face so the
 * amount becomes the visual centerpiece of the row. We intentionally use
 * `type="text"` + `inputMode="decimal"` rather than `type="number"`:
 *
 *   - `type=number` shows wheel/spinner controls in some browsers and
 *     loses the cursor on invalid keystrokes.
 *   - Locale-aware decimals (comma vs dot) confuse `valueAsNumber`.
 *   - We need to allow trailing dots ("12.") while the user is typing.
 *
 * Sanitization happens in the parent — this component is dumb on purpose.
 */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  function AmountInput({ className, value, onChange, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={cn(
          'display text-[26px] sm:text-[30px] md:text-[34px] leading-[1.05] tracking-tight',
          'w-full min-w-0 bg-transparent outline-none',
          'text-ink-1 placeholder:text-ink-3/50',
          'caret-accent',
          className,
        )}
        {...props}
      />
    );
  },
);
