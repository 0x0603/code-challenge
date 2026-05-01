import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from './use-local-storage';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = '99TechSwap.theme.v1';

const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

const applyTheme = (resolved: 'light' | 'dark') => {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
};

/**
 * Three-mode theme controller: light / dark / system. Resolves to a
 * concrete light-or-dark on every change so the page always has a known
 * appearance, and listens to the OS preference change while in `system`
 * mode so the page tracks the OS automatically without a refresh.
 */
export const useTheme = () => {
  const [theme, setTheme] = useLocalStorage<Theme>(STORAGE_KEY, 'system');
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    typeof window === 'undefined' ? 'light' : resolveTheme(theme),
  );

  useEffect(() => {
    const next = resolveTheme(theme);
    setResolved(next);
    applyTheme(next);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const r = mq.matches ? 'dark' : 'light';
      setResolved(r);
      applyTheme(r);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'));
  }, [setTheme]);

  return { theme, resolved, setTheme, cycle };
};
