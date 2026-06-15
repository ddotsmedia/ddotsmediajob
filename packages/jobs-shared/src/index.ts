export * from './constants';
export * from './validators';
export * from './date-utils';

/** Build a URL-friendly slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** Pluralise a job count: 1 → "1 job", else "N jobs" (locale-formatted). */
export function formatJobCount(n: number): string {
  return n === 1 ? '1 job' : `${n.toLocaleString('en-AE')} jobs`;
}

/** Format an AED salary range for display. */
export function formatSalary(
  min?: number | null,
  max?: number | null,
  period: string = 'monthly',
  hidden = false,
): string {
  // Treat 0 the same as unset — a job either has a real figure or it doesn't.
  const lo = min && min > 0 ? min : null;
  const hi = max && max > 0 ? max : null;
  if (hidden || (lo == null && hi == null)) return 'Salary not disclosed';
  const fmt = (n: number) => `AED ${n.toLocaleString('en-AE')}`;
  const suffix = period === 'monthly' ? '/mo' : period === 'yearly' ? '/yr' : period === 'daily' ? '/day' : '/hr';
  if (lo != null && hi != null) return `${fmt(lo)} – ${fmt(hi)}${suffix}`;
  if (lo != null) return `From ${fmt(lo)}${suffix}`;
  return `Up to ${fmt(hi as number)}${suffix}`;
}

/** Relative "time ago" string. */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.34, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];
  let value = secs;
  let unit = 'second';
  for (const [step, name] of units) {
    if (Math.abs(value) < step) {
      unit = name;
      break;
    }
    value = Math.floor(value / step);
    unit = name;
  }
  if (value < 1) return 'just now';
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}
