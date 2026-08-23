import { describe, it, expect } from 'vitest';
import { delta, rate, fillSeries, dayKeys, sum, ANALYTICS_RANGES } from './analytics-period';

describe('delta', () => {
  it('computes a straightforward increase', () => {
    expect(delta(150, 100)).toEqual({ current: 150, previous: 100, changePct: 50, direction: 'up' });
  });

  it('computes a decrease', () => {
    expect(delta(50, 100).changePct).toBe(-50);
    expect(delta(50, 100).direction).toBe('down');
  });

  it('reports flat when unchanged', () => {
    expect(delta(10, 10)).toMatchObject({ changePct: 0, direction: 'flat' });
  });

  it('refuses to invent a percentage from a zero baseline', () => {
    // 0 -> 5 is not "+500%"; the widget renders "new" instead.
    const d = delta(5, 0);
    expect(d.changePct).toBeNull();
    expect(d.direction).toBe('up');
  });

  it('handles zero to zero without dividing by zero', () => {
    expect(delta(0, 0)).toMatchObject({ changePct: null, direction: 'flat' });
  });

  it('rounds to one decimal', () => {
    expect(delta(1, 3).changePct).toBe(-66.7);
  });
});

describe('rate', () => {
  it('computes a percentage', () => {
    expect(rate(45, 60)).toBe(75);
  });

  it('distinguishes no-data from a genuine zero', () => {
    expect(rate(0, 0)).toBeNull(); // nothing to measure
    expect(rate(0, 10)).toBe(0);   // measured, and it is zero
  });

  it('never divides by a negative denominator', () => {
    expect(rate(5, -1)).toBeNull();
  });
});

describe('dayKeys', () => {
  it('produces an inclusive, ascending run of ISO dates', () => {
    const keys = dayKeys(new Date('2024-03-10T12:00:00Z'), 3);
    expect(keys).toEqual(['2024-03-08', '2024-03-09', '2024-03-10']);
  });

  it('crosses a month boundary correctly', () => {
    expect(dayKeys(new Date('2024-03-02T00:00:00Z'), 3)).toEqual(['2024-02-29', '2024-03-01', '2024-03-02']);
  });

  it('returns one key for a single day', () => {
    expect(dayKeys(new Date('2024-01-01T00:00:00Z'), 1)).toEqual(['2024-01-01']);
  });
});

describe('fillSeries', () => {
  const days = ['2024-03-01', '2024-03-02', '2024-03-03'];

  it('fills gaps with zeros so the axis stays continuous', () => {
    const out = fillSeries([{ date: '2024-03-02', jobs: 4, applications: 9 }], days);
    expect(out).toEqual([
      { date: '2024-03-01', jobs: 0, applications: 0 },
      { date: '2024-03-02', jobs: 4, applications: 9 },
      { date: '2024-03-03', jobs: 0, applications: 0 },
    ]);
  });

  it('always returns exactly one point per requested day', () => {
    expect(fillSeries([], days)).toHaveLength(3);
  });

  it('ignores rows outside the requested window', () => {
    const out = fillSeries([{ date: '2023-01-01', jobs: 99, applications: 99 }], days);
    expect(sum(out, 'jobs')).toBe(0);
  });

  it('coerces string counts from the driver to numbers', () => {
    const out = fillSeries([{ date: '2024-03-01', jobs: '7' as unknown as number }], days);
    expect(out[0]!.jobs).toBe(7);
    expect(typeof out[0]!.jobs).toBe('number');
  });
});

describe('ANALYTICS_RANGES', () => {
  it('is ascending and all positive', () => {
    const r = [...ANALYTICS_RANGES];
    expect(r).toEqual([...r].sort((a, b) => a - b));
    expect(r.every((n) => n > 0)).toBe(true);
  });
});
