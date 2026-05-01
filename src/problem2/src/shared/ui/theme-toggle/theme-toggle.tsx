import { useTheme, type Theme } from '@/shared/hooks';
import { cn } from '@/shared/lib/cn';

const ICONS: Record<Theme, JSX.Element> = {
  light: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  dark: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  system: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 21h6m-3-4v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

const LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

/**
 * Small text+icon button cycling light → dark → system. Putting the
 * mode label next to the icon avoids guessing what the toggle does on
 * first interaction.
 */
export const ThemeToggle = () => {
  const { theme, cycle } = useTheme();
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABELS[theme]}. Click to cycle.`}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full',
        'text-xs text-ink-2 hover:text-ink-1',
        'border border-border-default hover:border-ink-3/40',
        'transition-colors',
      )}
    >
      {ICONS[theme]}
      <span>{LABELS[theme]}</span>
    </button>
  );
};
