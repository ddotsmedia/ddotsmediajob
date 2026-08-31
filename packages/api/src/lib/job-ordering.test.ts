import { describe, it, expect } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { NEWEST_FIRST } from './job-ordering';

// Renders the ORDER BY without a database connection, so a regression is caught
// in CI rather than only on production data.
const dialect = new PgDialect();
const rendered = NEWEST_FIRST.map((e) => dialect.sqlToQuery(e as never).sql);
const orderBy = rendered.join(', ').toLowerCase();

describe('public listing order', () => {
  it('orders on created_at, which is notNull', () => {
    expect(rendered[0]!.toLowerCase()).toContain('created_at');
  });

  it('never orders on the nullable published_at', () => {
    // Confirmed in production: 3 live jobs had a null published_at, and
    // Postgres sorts NULLs FIRST under DESC, pinning them above every real
    // listing. Ordering on a nullable column reintroduces that.
    expect(orderBy).not.toContain('published_at');
  });

  it('sorts descending — newest first', () => {
    expect(rendered[0]!.toLowerCase()).toContain('desc');
  });

  it('breaks ties down to a total order, so pagination cannot repeat or skip rows', () => {
    // A bulk import stamps many rows with one timestamp; without a unique
    // final key the row order is undefined and pages overlap.
    expect(rendered.length).toBeGreaterThanOrEqual(2);
    expect(orderBy).toContain('"jobs"."id"');
  });

  it('every ordering term is descending', () => {
    for (const term of rendered) expect(term.toLowerCase(), term).toContain('desc');
  });
});
