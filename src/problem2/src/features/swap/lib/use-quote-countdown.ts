import { useEffect, useRef, useState } from 'react';

type CountdownArgs = {
  /** Whether the countdown should run. Pause it when the form is empty. */
  active: boolean;
  /** TTL in milliseconds — how long a quote stays valid. */
  ttlMs: number;
  /** Fired once each time the timer reaches zero. The countdown then resets. */
  onExpire: () => void;
};

type CountdownReturn = {
  /** Milliseconds remaining in the current cycle. */
  remainingMs: number;
  /** 0..1 fraction of the cycle still to go. Drives the SVG ring. */
  fraction: number;
};

/**
 * Drives a periodic refresh cycle for the live quote.
 *
 * Why custom instead of a setTimeout per cycle:
 *   - We want a smooth countdown UI, so the hook ticks every ~100ms and
 *     reports `remainingMs` for the ring.
 *   - The deadline is anchored to a wall-clock `Date.now()` baseline so a
 *     tab-throttled interval doesn't desync the ring from reality.
 *   - `onExpire` is captured in a ref so an unstable parent callback
 *     doesn't restart the interval and visually jitter the ring.
 */
export const useQuoteCountdown = ({
  active,
  ttlMs,
  onExpire,
}: CountdownArgs): CountdownReturn => {
  const [remainingMs, setRemainingMs] = useState(ttlMs);

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!active) {
      setRemainingMs(ttlMs);
      return;
    }

    let deadline = Date.now() + ttlMs;
    setRemainingMs(ttlMs);

    const interval = window.setInterval(() => {
      const left = deadline - Date.now();
      if (left <= 0) {
        onExpireRef.current();
        deadline = Date.now() + ttlMs;
        setRemainingMs(ttlMs);
      } else {
        setRemainingMs(left);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [active, ttlMs]);

  return {
    remainingMs,
    fraction: Math.max(0, Math.min(1, remainingMs / ttlMs)),
  };
};
