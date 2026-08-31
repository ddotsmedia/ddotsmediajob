import { desc } from 'drizzle-orm';
// Imported from the schema subpath so this module does not pull in the db
// client (and therefore does not require DATABASE_URL just to be loaded).
import { jobs } from '@ddots/db/schema';

/**
 * Newest-first ordering for every public job listing.
 *
 * Ordered on created_at, not published_at. published_at is nullable, and
 * PostgreSQL sorts NULLs FIRST under DESC — three live jobs with a null
 * published_at were pinning themselves above every real listing, pushing new
 * posts down to 4th/5th. created_at is notNull, so no row can float to the top.
 *
 * Trade-off worth knowing: a job imported as a draft and approved later now
 * sorts by its import date, so it appears where it was created rather than at
 * the top. Backfill published_at and order on that instead if approval time
 * should decide position.
 *
 * The id tiebreaker gives a total order: a bulk import stamps many rows with
 * the same created_at, and without it the same job can appear on two pages —
 * or on neither — as the paginated queries re-run.
 */
export const NEWEST_FIRST = [desc(jobs.createdAt), desc(jobs.id)];
