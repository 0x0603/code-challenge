import { useEffect } from 'react';

/**
 * Lock body scroll while `active` is true. The previous overflow value is
 * captured on mount and restored on cleanup, so nested locks compose
 * cleanly (the outer lock's restored value is whatever the inner lock saw,
 * which by induction is the original page state).
 */
export const useScrollLock = (active: boolean): void => {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
};
