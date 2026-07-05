import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Turn a script name into a URL-safe slug fragment. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'script';
}

/** ScriptBlox-style slug: "my-cool-script-a1b2c3" (name + short unique suffix). */
export function buildScriptSlug(name: string, suffix: string): string {
  return `${slugify(name)}-${suffix.replace(/-/g, '').slice(0, 6)}`;
}

/** Compact "x ago" formatter used across cards and detail pages. */
export function timeAgo(date: string | Date): string {
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [31536000, 'year'],
    [2592000, 'month'],
    [604800, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
    [1, 'second'],
  ];
  for (const [secsInUnit, label] of units) {
    const value = Math.floor(secs / secsInUnit);
    if (value >= 1) return `${value} ${label}${value === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}

/** Compact view counts: 24, 3.1k, 1.7M — like ScriptBlox. */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}
