import type { Config } from 'tailwindcss';

// Color tokens are defined as CSS variables in src/app/styles/tokens.css.
// Mapping them here lets Tailwind opacity modifiers work (e.g. bg-surface/80)
// and keeps light/dark theming in CSS rather than in JS.
const withVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: withVar('--color-bg'),
        surface: withVar('--color-surface'),
        'surface-elevated': withVar('--color-surface-elevated'),
        'border-subtle': withVar('--color-border-subtle'),
        'border-default': withVar('--color-border-default'),
        'ink-1': withVar('--color-ink-1'),
        'ink-2': withVar('--color-ink-2'),
        'ink-3': withVar('--color-ink-3'),
        accent: withVar('--color-accent'),
        'accent-soft': withVar('--color-accent-soft'),
        'accent-fg': withVar('--color-accent-fg'),
        positive: withVar('--color-positive'),
        warning: withVar('--color-warning'),
        negative: withVar('--color-negative'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['3.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        card: '1.5rem',
        input: '0.75rem',
      },
      boxShadow: {
        card: [
          '0 1px 2px rgba(20, 17, 12, 0.04)',
          '0 4px 12px rgba(20, 17, 12, 0.04)',
          '0 12px 32px rgba(20, 17, 12, 0.04)',
          '0 24px 64px rgba(20, 17, 12, 0.03)',
        ].join(', '),
        'focus-ring': '0 0 0 3px rgb(var(--color-accent) / 0.18)',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
