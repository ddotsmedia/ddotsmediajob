/**
 * Period maths for the admin analytics widget. Pure — no DB, no dates from the
 * clock, so every case is reproducible in a test.
 */

/** Ranges the widget offers, in days. */
export const ANALYTICS_RANGES = [7, 14, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export type Delta = {
  current: number;
  previous: number;
  /** Percent change vs the previous period of equal length; null when undefined. */
  changePct: number | null;
  direction: 'up' | 'down' | 'flat';
};

/**
 * Compare a period against the one immediately before it.
 *
 * `changePct` is null when the previous period was zero: going 0 → 5 is not
 * "+500%", it is a start from nothing, and rendering a percentage there is
 * actively misleading. The caller shows "new" instead.
 */
export function delta(current: number, previous: number): Delta {
  const direction = current > previous ? 'up' : current < previous ? 'down' : 'flat';
  if (previous === 0) return { current, previous, changePct: null, direction };
  const pct = ((current - previous) / previous) * 100;
  // One decimal is as much precision as a count-based ratio can justify.
  return { current, previous, changePct: Math.round(pct * 10) / 10, direction };
}

/**
 * A rate as a percentage, guarding the zero denominator.
 * Returns null rather than 0 so "no data" and "genuinely 0%" stay distinct.
 */
export function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export type SeriesPoint = { date: string; jobs: number; applications: number };

/**
 * Fill missing days with zeros so a chart's x-axis is continuous.
 *
 * The SQL uses generate_series and so returns every day already; this exists
 * for the degraded path where a driver returns only the days that had rows —
 * a gappy series silently misdraws a trend rather than erroring.
 */
export function fillSeries(rows: Partial<SeriesPoint>[], days: string[]): SeriesPoint[] {
  const byDate = new Map(rows.filter((r) => r.date).map((r) => [r.date as string, r]));
  return days.map((date) => {
    const r = byDate.get(date);
    return { date, jobs: Number(r?.jobs ?? 0), applications: Number(r?.applications ?? 0) };
  });
}

/** Inclusive list of ISO dates ending at `end`, `days` long. */
export function dayKeys(end: Date, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function sum(rows: SeriesPoint[], key: 'jobs' | 'applications'): number {
  return rows.reduce((t, r) => t + r[key], 0);
}
