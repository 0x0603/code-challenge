import { useCallback, useEffect, useState } from 'react';

/**
 * Tiny localStorage-backed state hook with JSON serialization.
 *
 * Design notes:
 *   - SSR-safe: lazy-init reads window inside the initializer, but we
 *     guard just in case; React's strict-mode double-invoke is fine.
 *   - Cross-tab sync: `storage` events keep multiple tabs aligned.
 *   - Failure tolerant: a corrupted value falls back to the default
 *     instead of crashing the page (the saved value is overwritten on
 *     the next setter call).
 */
export const useLocalStorage = <T,>(key: string, initial: T) => {
  const read = useCallback((): T => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  }, [key, initial]);

  const [value, setValue] = useState<T>(read);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Quota exceeded or storage disabled — keep in-memory state usable.
        }
        return resolved;
      });
    },
    [key],
  );

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) return;
      try {
        setValue(JSON.parse(event.newValue) as T);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  return [value, update] as const;
};
