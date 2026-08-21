import { describe, it, expect } from 'vitest';
import { sortAccessors, type AdminJob } from './useAdvancedJobsTable';

// The admin table sorts on these accessors rather than the formatted cell text,
// so a regression here silently sorts "3d ago" / "AED 5,000" as strings.
function job(over: Partial<AdminJob>): AdminJob {
  return {
    id: 'id',
    title: 'Job',
    slug: 'job',
    status: 'active',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    publishedAt: null,
    viewCount: 0,
    salaryMin: null,
    salaryMax: null,
    salaryHidden: false,
    company: null,
    ...over,
  } as AdminJob;
}

const sortBy = (fn: (r: AdminJob) => string | number, rows: AdminJob[]) =>
  [...rows].sort((a, b) => {
    const x = fn(a);
    const y = fn(b);
    return x < y ? -1 : x > y ? 1 : 0;
  });

describe('sortAccessors.posted', () => {
  it('prefers publishedAt over createdAt', () => {
    const r = job({ createdAt: new Date('2024-01-01Z'), publishedAt: new Date('2024-06-01Z') });
    expect(sortAccessors.posted(r)).toBe(new Date('2024-06-01Z').getTime());
  });

  it('falls back to createdAt when never published', () => {
    const r = job({ createdAt: new Date('2024-01-01Z'), publishedAt: null });
    expect(sortAccessors.posted(r)).toBe(new Date('2024-01-01Z').getTime());
  });

  it('orders chronologically, not lexicographically', () => {
    // Dec sorts after Feb numerically but before it as a "12/2" style string.
    const feb = job({ id: 'feb', createdAt: new Date('2024-02-01Z') });
    const dec = job({ id: 'dec', createdAt: new Date('2024-12-01Z') });
    expect(sortBy(sortAccessors.posted, [dec, feb]).map((r) => r.id)).toEqual(['feb', 'dec']);
  });
});

describe('sortAccessors.salary', () => {
  it('sorts numerically, not as strings', () => {
    // '9000' > '10000' lexicographically — this is the bug the accessor prevents.
    const low = job({ id: 'low', salaryMin: 9000 });
    const high = job({ id: 'high', salaryMin: 10000 });
    expect(sortBy(sortAccessors.salary, [high, low]).map((r) => r.id)).toEqual(['low', 'high']);
  });

  it('falls back to salaryMax when there is no minimum', () => {
    expect(sortAccessors.salary(job({ salaryMin: null, salaryMax: 7000 }))).toBe(7000);
  });

  it('sinks hidden salaries below every disclosed figure', () => {
    const hidden = job({ id: 'hidden', salaryMin: 99000, salaryHidden: true });
    const shown = job({ id: 'shown', salaryMin: 3000 });
    expect(sortBy(sortAccessors.salary, [shown, hidden]).map((r) => r.id)).toEqual(['hidden', 'shown']);
  });
});

describe('sortAccessors.views', () => {
  it('treats a missing count as zero', () => {
    expect(sortAccessors.views(job({ viewCount: undefined }))).toBe(0);
  });

  it('sorts numerically', () => {
    const a = job({ id: 'a', viewCount: 9 });
    const b = job({ id: 'b', viewCount: 100 });
    expect(sortBy(sortAccessors.views, [b, a]).map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('sortAccessors.company', () => {
  it('renders jobs with no company as an empty key rather than throwing', () => {
    expect(sortAccessors.company(job({ company: null }))).toBe('');
    expect(sortAccessors.company(job({ company: { name: 'Emaar' } }))).toBe('Emaar');
  });
});
