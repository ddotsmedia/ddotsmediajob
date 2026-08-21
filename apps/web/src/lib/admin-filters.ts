import { EMIRATES, JOB_STATUS, type JobStatus } from '@ddots/shared';
import { statusLabel } from './job-status-display';

/**
 * Admin jobs list filter state.
 *
 * Mirrors `adminJobFilterSchema` on the server — the server is authoritative and
 * revalidates everything; this type exists so the panel and the query agree.
 */
export type AdminFilters = {
  q?: string;
  status?: JobStatus[];
  emirate?: string[];
  salaryMin?: number;
  salaryMax?: number;
  company?: string;
  dateFrom?: string; // ISO date (yyyy-mm-dd) — serialisable for saved presets
  dateTo?: string;
  salaryDisclosedOnly?: boolean;
};

export type FilterOption = { value: string; label: string };

/**
 * Facet options come from the real constants, not a hand-copied list: the
 * statuses are the nine in the DB enum (there is no "approved" or "live" —
 * an approved job is `active`), and the emirates are the canonical seven.
 */
export const STATUS_OPTIONS: FilterOption[] = JOB_STATUS.map((s) => ({ value: s, label: statusLabel(s) }));
export const EMIRATE_OPTIONS: FilterOption[] = EMIRATES.map((e) => ({ value: e.slug, label: e.name }));

export const EMPTY_FILTERS: AdminFilters = {};

/** A filter key counts as active only when it actually narrows the results. */
function isActive(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0; // [] is "no filter", not a filter
  if (value === false) return false;
  return true;
}

/** How many filters are narrowing the list — drives the badge on the Filters button. */
export function activeFilterCount(f: AdminFilters): number {
  return Object.values(f).filter(isActive).length;
}

export function hasAnyFilter(f: AdminFilters): boolean {
  return activeFilterCount(f) > 0;
}

/**
 * Drop empty values so the query key stays stable.
 *
 * Without this, `{status: []}` and `{}` are different cache keys for the same
 * result, and every panel edit that clears a facet refetches needlessly.
 */
export function normalizeFilters(f: AdminFilters): AdminFilters {
  const out: AdminFilters = {};
  for (const [k, v] of Object.entries(f)) {
    if (isActive(v)) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Convert to the server's input shape (ISO strings → Date). */
export function toQueryInput(f: AdminFilters) {
  const n = normalizeFilters(f);
  return {
    ...n,
    dateFrom: n.dateFrom ? new Date(n.dateFrom) : undefined,
    dateTo: n.dateTo ? new Date(`${n.dateTo}T23:59:59.999Z`) : undefined, // inclusive end-of-day
  };
}

/** Toggle one value in a multi-select facet. */
export function toggleValue<T extends string>(list: T[] | undefined, value: T): T[] {
  const cur = list ?? [];
  return cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
}

// ─── URL synchronisation ──────────────────────────────────────────
// Filters live in the query string so a filtered view survives a refresh and
// can be pasted to another admin. Values are validated on the way back in:
// a hand-edited ?status=bogus must not reach the server and fail its enum.

const PARAM = {
  q: 'q',
  status: 'status',
  emirate: 'emirate',
  salaryMin: 'min',
  salaryMax: 'max',
  company: 'company',
  dateFrom: 'from',
  dateTo: 'to',
  salaryDisclosedOnly: 'disclosed',
} as const;

const VALID_STATUS = new Set<string>(JOB_STATUS);
const VALID_EMIRATE = new Set<string>(EMIRATES.map((e) => e.slug));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function filtersToSearchParams(f: AdminFilters): URLSearchParams {
  const sp = new URLSearchParams();
  const n = normalizeFilters(f);
  if (n.q) sp.set(PARAM.q, n.q);
  if (n.status?.length) sp.set(PARAM.status, n.status.join(','));
  if (n.emirate?.length) sp.set(PARAM.emirate, n.emirate.join(','));
  if (n.salaryMin !== undefined) sp.set(PARAM.salaryMin, String(n.salaryMin));
  if (n.salaryMax !== undefined) sp.set(PARAM.salaryMax, String(n.salaryMax));
  if (n.company) sp.set(PARAM.company, n.company);
  if (n.dateFrom) sp.set(PARAM.dateFrom, n.dateFrom);
  if (n.dateTo) sp.set(PARAM.dateTo, n.dateTo);
  if (n.salaryDisclosedOnly) sp.set(PARAM.salaryDisclosedOnly, '1');
  return sp;
}

/** Parse a query string back into filters, discarding anything unrecognised. */
export function filtersFromSearchParams(sp: URLSearchParams): AdminFilters {
  const f: AdminFilters = {};

  const q = sp.get(PARAM.q)?.trim();
  if (q) f.q = q;

  const status = sp.get(PARAM.status)?.split(',').filter((s) => VALID_STATUS.has(s)) as JobStatus[] | undefined;
  if (status?.length) f.status = status;

  const emirate = sp.get(PARAM.emirate)?.split(',').filter((s) => VALID_EMIRATE.has(s));
  if (emirate?.length) f.emirate = emirate;

  // Non-numeric or negative bounds are dropped rather than sent as NaN.
  const min = Number(sp.get(PARAM.salaryMin));
  if (sp.has(PARAM.salaryMin) && Number.isFinite(min) && min >= 0) f.salaryMin = Math.floor(min);
  const max = Number(sp.get(PARAM.salaryMax));
  if (sp.has(PARAM.salaryMax) && Number.isFinite(max) && max >= 0) f.salaryMax = Math.floor(max);

  const company = sp.get(PARAM.company)?.trim();
  if (company) f.company = company;

  const from = sp.get(PARAM.dateFrom);
  if (from && ISO_DATE.test(from)) f.dateFrom = from;
  const to = sp.get(PARAM.dateTo);
  if (to && ISO_DATE.test(to)) f.dateTo = to;

  if (sp.get(PARAM.salaryDisclosedOnly) === '1') f.salaryDisclosedOnly = true;

  return f;
}

/** Short human summary of what's applied, for the active-filter chips row. */
export function describeFilters(f: AdminFilters): { key: keyof AdminFilters; label: string }[] {
  const out: { key: keyof AdminFilters; label: string }[] = [];
  if (f.q) out.push({ key: 'q', label: `“${f.q}”` });
  if (f.status?.length) out.push({ key: 'status', label: `Status: ${f.status.map(statusLabel).join(', ')}` });
  if (f.emirate?.length) {
    const names = f.emirate.map((s) => EMIRATES.find((e) => e.slug === s)?.name ?? s);
    out.push({ key: 'emirate', label: `Emirate: ${names.join(', ')}` });
  }
  if (f.company) out.push({ key: 'company', label: `Company: ${f.company}` });
  if (f.salaryMin !== undefined || f.salaryMax !== undefined) {
    const lo = f.salaryMin !== undefined ? `AED ${f.salaryMin.toLocaleString()}` : 'any';
    const hi = f.salaryMax !== undefined ? `AED ${f.salaryMax.toLocaleString()}` : 'any';
    out.push({ key: 'salaryMin', label: `Salary: ${lo} – ${hi}` });
  }
  if (f.salaryDisclosedOnly) out.push({ key: 'salaryDisclosedOnly', label: 'Salary disclosed' });
  if (f.dateFrom || f.dateTo) out.push({ key: 'dateFrom', label: `Posted: ${f.dateFrom ?? 'any'} → ${f.dateTo ?? 'any'}` });
  return out;
}
