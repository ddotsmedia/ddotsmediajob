import { sql, desc } from 'drizzle-orm';
// Imported from the schema subpath so this module does not pull in the db
// client (and therefore does not require DATABASE_URL to be loaded).
import { jobs } from '@ddots/db/schema';

/**
 * Newest-first ordering for every public listing.
 *
 * `published_at` is nullable, and PostgreSQL sorts NULLs FIRST under DESC — so a
 * live job whose published_at was never set pins above every correctly-published
 * job, permanently, pushing genuinely new posts down the list. coalescing to
 * created_at removes that, and matches what the `postedWithin` filter below
 * already does (previously the filter and the sort disagreed).
 *
 * created_at then id break ties: a bulk import stamps many rows with the same
 * timestamp, and without a total order the same job can appear on two pages
 * (or on neither) as the paginated queries re-run.
 */
export const NEWEST_FIRST = [
  sql`coalesce(${jobs.publishedAt}, ${jobs.createdAt}) DESC`,
  desc(jobs.createdAt),
  desc(jobs.id),
];
