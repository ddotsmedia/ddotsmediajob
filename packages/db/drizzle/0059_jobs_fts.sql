-- Full-text search on jobs.
--
-- A GENERATED ALWAYS ... STORED column, not a trigger. Postgres recomputes it
-- on every INSERT and UPDATE itself, so it can never drift from the row, and
-- there is no plpgsql function to keep in sync with the schema. A trigger and
-- a generated column are mutually exclusive: assigning NEW.search_vector on a
-- generated column raises "cannot insert a non-DEFAULT value into column".
--
-- Weighting: title 'A', description 'B', so a title hit ranks above a body hit.
-- Company name is NOT included — the jobs table has no company_name column
-- (it lives on companies.name behind a nullable FK), and a generated column may
-- only reference columns of its own row.
--
-- Additive and backwards compatible: nothing reads or writes this column until
-- admin.jobsSearch is deployed.

ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B')
  ) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_search_idx" ON "jobs" USING gin ("search_vector");
