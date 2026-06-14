/**
 * UAE-timezone date helpers. Storage is UTC; display is always Asia/Dubai (UTC+4).
 * Server + client safe (no window/document). All functions handle null/undefined → ''.
 * Uses built-in Intl.DateTimeFormat — no external library.
 */
export const UAE_TZ = 'Asia/Dubai';

function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
}

const part = (d: Date, opts: Intl.DateTimeFormatOptions, locale = 'en-GB') =>
  new Intl.DateTimeFormat(locale, { timeZone: UAE_TZ, ...opts }).format(d);

/** YYYY-MM-DD in UAE time (for day comparisons). */
const uaeYmd = (d: Date) => part(d, { year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA');
const uaeTime = (d: Date) => part(d, { hour: 'numeric', minute: '2-digit', hour12: true }, 'en-US');

/** "Posted today at 9:30 AM" / "Posted yesterday…" / "Posted 3 days ago · Mon 11 Jun" / "Posted 14 Jun 2026". */
export function formatJobDate(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return '';
  const now = new Date();
  const today = uaeYmd(now);
  const yesterday = uaeYmd(new Date(now.getTime() - 86_400_000));
  const day = uaeYmd(dt);
  if (day === today) return `Posted today at ${uaeTime(dt)}`;
  if (day === yesterday) return `Posted yesterday at ${uaeTime(dt)}`;
  const days = Math.floor((now.getTime() - dt.getTime()) / 86_400_000);
  if (days >= 2 && days < 7) return `Posted ${days} days ago · ${part(dt, { weekday: 'short', day: 'numeric', month: 'short' })}`;
  return `Posted ${part(dt, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** "14 Jun 2026, 9:30 AM" (compact, UAE time) — for tables. */
export function formatShort(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return '';
  return `${part(dt, { day: 'numeric', month: 'short', year: 'numeric' })}, ${uaeTime(dt)}`;
}

/** "Monday, 14 June 2026 at 9:30 AM (UAE time)". */
export function formatDateTime(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return '';
  const date = part(dt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${date} at ${uaeTime(dt)} (UAE time)`;
}

/** "just now" / "2 hours ago" / "3 days ago" / falls back to a date for old items. */
export function formatRelative(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return '';
  const s = (Date.now() - dt.getTime()) / 1000;
  if (s < 0) return 'just now';
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return part(dt, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Posted within the last 24 hours. */
export function isNew(d: Date | string | null | undefined): boolean {
  const dt = toDate(d);
  return !!dt && Date.now() - dt.getTime() < 86_400_000;
}

/** Posted today (UAE calendar day). */
export function isToday(d: Date | string | null | undefined): boolean {
  const dt = toDate(d);
  return !!dt && uaeYmd(dt) === uaeYmd(new Date());
}

export function isExpired(deadline: Date | string | null | undefined): boolean {
  const dt = toDate(deadline);
  return !!dt && dt.getTime() < Date.now();
}

/** "Expires in 14 days" / "Expires tomorrow" / "Expires today" / "Expired 2 days ago". */
export function timeUntilExpiry(deadline: Date | string | null | undefined): string {
  const dt = toDate(deadline);
  if (!dt) return '';
  const today = uaeYmd(new Date());
  const target = uaeYmd(dt);
  const diffDays = Math.round((new Date(`${target}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000);
  if (diffDays < 0) return `Expired ${Math.abs(diffDays)} day${diffDays === -1 ? '' : 's'} ago`;
  if (diffDays === 0) return 'Expires today';
  if (diffDays === 1) return 'Expires tomorrow';
  return `Expires in ${diffDays} days`;
}
