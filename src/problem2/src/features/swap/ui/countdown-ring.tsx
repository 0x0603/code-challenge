import { cn } from '@/shared/lib/cn';

type CountdownRingProps = {
  /** 0..1 fraction of cycle remaining. */
  fraction: number;
  size?: number;
  stroke?: number;
  className?: string;
};

/**
 * A small SVG ring that drains from full to empty as `fraction` goes from
 * 1 to 0. Color shifts from accent → warning when the cycle is nearly
 * over so the user has time to act before refresh.
 */
export const CountdownRing = ({
  fraction,
  size = 18,
  stroke = 2,
  className,
}: CountdownRingProps) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - fraction);
  const isWarning = fraction <= 0.25;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className={cn('shrink-0 -rotate-90', className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        style={{
          transition: 'stroke-dashoffset 100ms linear',
          color: isWarning ? 'rgb(var(--color-warning))' : 'currentColor',
        }}
      />
    </svg>
  );
};
