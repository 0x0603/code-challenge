import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Trap focus inside the returned ref's element while `active` is true.
 *
 * Behavior:
 *   - On activate: remember the previously focused element, then move focus
 *     into the container (auto-focus the first focusable child).
 *   - While active: Tab and Shift+Tab cycle within the container.
 *   - On deactivate: restore focus to the previously focused element.
 *
 * Not a replacement for a hardened library like focus-trap, but covers the
 * cases this app actually needs (dialogs with predictable focusable lists).
 */
export const useFocusTrap = <T extends HTMLElement>(active: boolean) => {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const queryFocusable = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (node) => !node.hasAttribute('data-focus-skip'),
      );

    const focusables = queryFocusable();
    focusables[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const list = queryFocusable();
      if (list.length === 0) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      const current = document.activeElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
};
