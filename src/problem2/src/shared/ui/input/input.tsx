import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/shared/lib/cn';

type Size = 'sm' | 'md' | 'lg';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  inputSize?: Size;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  invalid?: boolean;
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-input',
  md: 'h-11 px-4 text-base rounded-input',
  lg: 'h-14 px-5 text-lg rounded-input',
};

/**
 * Single text-input primitive used for search, addresses, etc.
 *
 * Numeric inputs in the swap form use a separate hand-tuned input element
 * because the editorial display style (serif, large size) doesn't fit the
 * generic adornment layout here.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, inputSize = 'md', leftSlot, rightSlot, invalid, ...props },
  ref,
) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 bg-surface border transition-colors',
        invalid ? 'border-negative' : 'border-border-default',
        'focus-within:border-accent focus-within:shadow-focus-ring',
        sizeStyles[inputSize],
        className,
      )}
    >
      {leftSlot ? (
        <span className="shrink-0 text-ink-3" aria-hidden>
          {leftSlot}
        </span>
      ) : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex-1 bg-transparent outline-none',
          'placeholder:text-ink-3 text-ink-1',
        )}
        {...props}
      />
      {rightSlot ? (
        <span className="shrink-0 text-ink-3" aria-hidden>
          {rightSlot}
        </span>
      ) : null}
    </div>
  );
});
