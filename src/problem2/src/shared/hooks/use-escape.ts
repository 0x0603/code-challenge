import { useEffect } from 'react';

/**
 * Fire `onEscape` when the user presses Escape, but only while `active`
 * is true. Listening at the document level means modals get the key even
 * when focus is on a nested input.
 */
export const useEscape = (onEscape: () => void, active = true): void => {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, active]);
};
