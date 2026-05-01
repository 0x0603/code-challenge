import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class lists safely. `clsx` handles conditionals;
 * `tailwind-merge` resolves conflicts so consumers can override
 * (e.g. a parent passing `bg-red-500` wins over a default `bg-surface`).
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
