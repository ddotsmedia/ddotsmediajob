import { describe, it, expect } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { NEWEST_FIRST } from './job-ordering';

// Renders the ORDER BY without a database connection, so the regression is
// caught in CI rather than only on production data.
const dialect = new PgDialect();
const rendered = NEWEST_FIRST.map((e) => dialect.sqlToQuery(e as never).sql);
const orderBy = rendered.join(', ').toLowerCase();

describe('public listing order', () => {
  it('coalesces published_at to created_at', () => {
    // Bare `published_at DESC` sorts NULLs FIRST in Postgres, pinning any live
    // job with no published_at above every real one — the reported bug.
    expect(orderBy).toContain('coalesce');
    expect(rendered[0]!.toLowerCase()).toContain('published_at');
    expect(rendered[0]!.toLowerCase()).toContain('created_at');
  });

  it('does not order on a bare nullable published_at', () => {
    expect(rendered[0]).not.toMatch(/^"jobs"\."published_at"/);
  });

  it('sorts descending — newest first', () => {
    expect(rendered[0]!.toLowerCase()).toContain('desc');
  });

  it('breaks ties down to a total order, so pagination cannot repeat or skip rows', () => {
    // A bulk import stamps many rows with one timestamp; without a unique
    // final key the row order is undefined and pages overlap.
    expect(rendered.length).toBeGreaterThanOrEqual(3);
    expect(orderBy).toContain('"jobs"."id"');
  });

  it('every ordering term is descending', () => {
    for (const term of rendered) expect(term.toLowerCase(), term).toContain('desc');
  });
});
