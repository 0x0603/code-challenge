import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/cn';

type SwapDirectionButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

/**
 * The flip button between pay/receive rows. Tap rotates the icon by a
 * half turn (180°) and bumps a visual cue; the parent handles the actual
 * symbol/amount swap. Keeping the visual feedback here lets the form
 * stay agnostic about animation timing.
 */
export const SwapDirectionButton = ({ onClick, disabled }: SwapDirectionButtonProps) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Reverse swap direction"
      whileTap={{ scale: 0.92 }}
      className={cn(
        'inline-flex items-center justify-center',
        'h-10 w-10 rounded-full',
        'bg-surface border border-border-default',
        'shadow-sm',
        'text-ink-1',
        'transition-colors',
        'hover:border-accent hover:text-accent',
        'focus-visible:outline-none focus-visible:shadow-focus-ring',
        'disabled:opacity-40 disabled:hover:border-border-default disabled:hover:text-ink-1',
      )}
    >
      <motion.svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        whileHover={{ rotate: 180 }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        aria-hidden
      >
        <path
          d="M7 4v12m0 0l-3-3m3 3l3-3M17 20V8m0 0l3 3m-3-3l-3 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.button>
  );
};
