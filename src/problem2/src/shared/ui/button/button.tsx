import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium tracking-tight whitespace-nowrap',
    'select-none',
    'transition-[transform,background-color,color,box-shadow,border-color] duration-200 ease-editorial',
    'focus-visible:outline-none focus-visible:shadow-focus-ring',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-accent text-accent-fg',
          'hover:brightness-110',
          'shadow-[0_1px_2px_rgba(15,81,50,0.16),0_4px_12px_rgba(15,81,50,0.10)]',
        ],
        secondary: [
          'bg-surface text-ink-1 border border-border-default',
          'hover:border-ink-3/40 hover:bg-surface-elevated',
        ],
        ghost: [
          'bg-transparent text-ink-2',
          'hover:bg-accent-soft hover:text-accent',
        ],
        destructive: [
          'bg-negative text-white',
          'hover:brightness-110',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-input',
        md: 'h-11 px-5 text-sm rounded-input',
        lg: 'h-14 px-6 text-base rounded-input',
        icon: 'h-10 w-10 rounded-full',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    leftSlot?: ReactNode;
    rightSlot?: ReactNode;
  };

/**
 * The single button primitive. All other interactive surfaces (icon-only,
 * destructive, link-styled) compose this — consumers should never reach for
 * a raw <button> in feature code, so accessibility and motion stay uniform.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    fullWidth,
    loading = false,
    leftSlot,
    rightSlot,
    disabled,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading ? <Spinner /> : leftSlot}
      {children}
      {rightSlot}
    </button>
  );
});

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path
      d="M21 12a9 9 0 0 1-9 9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);
