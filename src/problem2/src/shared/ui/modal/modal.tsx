import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEscape, useFocusTrap, useScrollLock } from '@/shared/hooks';
import { cn } from '@/shared/lib/cn';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Used for the dialog's accessible name (sr-only if `header` not visual). */
  title: string;
  /** Optional visible header rendered inside the dialog frame. */
  header?: ReactNode;
  children: ReactNode;
  /** Tailwind width class, e.g. `max-w-md`. Default `max-w-md`. */
  widthClassName?: string;
};

/**
 * The single modal primitive. Owns:
 *   - Portal placement (avoids stacking-context surprises in feature trees).
 *   - Backdrop click + Escape close.
 *   - Body scroll lock.
 *   - Focus trap with auto-focus on open and restore on close.
 *   - Enter/exit motion that shares timing with the rest of the app.
 *
 * Feature code never composes a dialog from scratch; it passes content
 * here, so a11y wiring stays in one place.
 */
export const Modal = ({
  open,
  onClose,
  title,
  header,
  children,
  widthClassName = 'max-w-md',
}: ModalProps) => {
  useEscape(onClose, open);
  useScrollLock(open);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <div
            className="absolute inset-0 bg-ink-1/30 backdrop-blur-[2px] dark:bg-black/50"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              'relative mx-auto mt-[8vh] mb-8 px-4',
              'w-full',
              widthClassName,
            )}
          >
            <div
              className={cn(
                'rounded-card bg-surface shadow-card border border-border-subtle',
                'overflow-hidden',
              )}
            >
              {header}
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
