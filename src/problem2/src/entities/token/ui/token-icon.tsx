import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

type TokenIconProps = {
  symbol: string;
  iconUrl: string;
  size?: number;
  className?: string;
};

/**
 * Renders the token's SVG icon from the Switcheo CDN, falling back to a
 * letter circle when the icon 404s. The fallback uses the first character
 * of the symbol on a deterministic background derived from the symbol —
 * stable across renders so layouts don't shift.
 *
 * Loading state is intentionally minimal (no skeleton): icons are tiny and
 * mostly cached, so a flash of letter-fallback is more honest than an
 * indeterminate shimmer.
 */
export const TokenIcon = ({ symbol, iconUrl, size = 28, className }: TokenIconProps) => {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size };

  if (failed) {
    return (
      <span
        aria-hidden
        style={{ ...dimension, backgroundColor: hueFromSymbol(symbol) }}
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'text-[0.6em] font-semibold text-white tracking-tight',
          className,
        )}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={iconUrl}
      alt=""
      style={dimension}
      onError={() => setFailed(true)}
      className={cn('inline-block rounded-full bg-bg', className)}
      loading="lazy"
      decoding="async"
    />
  );
};

const hueFromSymbol = (symbol: string): string => {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}deg 45% 42%)`;
};
