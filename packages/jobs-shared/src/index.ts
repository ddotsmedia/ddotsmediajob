export * from './constants';
export * from './validators';
export * from './date-utils';
export * from './i18n';
export * from './job-emoji';

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

/** Deterministic seeker↔job fit score (0–100): category 30, emirate 20, experience 20, skills 30. */
export type MatchSeeker = { categorySlug?: string | null; emirateSlug?: string | null; experienceLevel?: string | null; skills?: string[] | null };
export type MatchJob = { categorySlug: string; emirateSlug: string; experienceLevel?: string | null; skills?: string[] | null };
export function computeMatchScore(s: MatchSeeker, j: MatchJob): number {
  let score = 0;
  if (s.categorySlug && s.categorySlug === j.categorySlug) score += 30;
  if (s.emirateSlug && s.emirateSlug === j.emirateSlug) score += 20;
  if (s.experienceLevel && j.experienceLevel && s.experienceLevel === j.experienceLevel) score += 20;
  const ss = (s.skills ?? []).map((x) => x.toLowerCase().trim()).filter(Boolean);
  const js = (j.skills ?? []).map((x) => x.toLowerCase().trim()).filter(Boolean);
  if (js.length && ss.length) {
    const overlap = js.filter((k) => ss.includes(k)).length;
    score += Math.round((overlap / js.length) * 30);
  }
  return Math.min(100, score);
}
export function matchBadge(score: number): { label: string; cls: string } | null {
  if (score >= 90) return { label: '🎯 Perfect match', cls: 'bg-teal-100 text-teal-700' };
  if (score >= 70) return { label: '✅ Strong match', cls: 'bg-green-100 text-green-700' };
  if (score >= 50) return { label: '👍 Good match', cls: 'bg-blue-100 text-blue-700' };
  return null;
}

/** Employer response-speed badge from avg first-response hours (null = no badge). */
export function responseBadge(hours: number | null | undefined): { label: string; cls: string } | null {
  if (hours == null) return null;
  if (hours < 2) return { label: '⚡ Responds quickly', cls: 'bg-green-100 text-green-700' };
  if (hours < 24) return { label: '✅ Active employer', cls: 'bg-teal-100 text-teal-700' };
  return null;
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
  negotiable = false,
): string {
  if (negotiable) return 'Negotiable';
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
