import { useEffect, useState } from 'react';

type HistoryEntry = {
  rate: number;
  recordedAt: number;
};

export type RateHistory = {
  /** Rate the first time the user looked at this pair this session. */
  baselineRate: number | null;
  /** Fractional change vs the baseline. Positive = rate improved for the user. */
  deltaFraction: number | null;
  /** Milliseconds since the baseline was recorded. */
  ageMs: number;
};

const buildKey = (pair: string) => `flowswap.rate-history.${pair}.v1`;

const safeRead = (key: string): HistoryEntry | null => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HistoryEntry;
    if (typeof parsed.rate !== 'number' || typeof parsed.recordedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const safeWrite = (key: string, entry: HistoryEntry) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota or disabled — fail silently */
  }
};

/**
 * Tracks the rate the first time the user opened a given pair this
 * session, and reports how far the live rate has drifted since. We
 * intentionally do NOT update the baseline as the user watches — the
 * value is "since you opened the form", which lets a returning visitor
 * see whether the deal has improved or worsened.
 *
 * Cleared on tab close (sessionStorage). The pair key changes on flip,
 * so each direction of the same pair tracks independently.
 */
export const useRateHistory = (
  pair: string | null,
  currentRate: number | null,
): RateHistory => {
  const [entry, setEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    if (!pair) {
      setEntry(null);
      return;
    }
    const key = buildKey(pair);
    const existing = safeRead(key);
    if (existing) {
      setEntry(existing);
      return;
    }
    if (currentRate !== null && Number.isFinite(currentRate)) {
      const fresh: HistoryEntry = { rate: currentRate, recordedAt: Date.now() };
      safeWrite(key, fresh);
      setEntry(fresh);
    }
  }, [pair, currentRate]);

  if (entry === null || currentRate === null) {
    return { baselineRate: null, deltaFraction: null, ageMs: 0 };
  }

  return {
    baselineRate: entry.rate,
    deltaFraction: entry.rate === 0 ? 0 : (currentRate - entry.rate) / entry.rate,
    ageMs: Date.now() - entry.recordedAt,
  };
};
