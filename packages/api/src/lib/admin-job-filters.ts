import { z } from 'zod';
import { db, jobs, companies, and, or, gte, lte, ilike, inArray, isNotNull } from '@ddots/db';
import type { SQL } from 'drizzle-orm';
import { JOB_STATUS, toEmirateSlug } from '@ddots/shared';

/**
 * One definition of "which jobs match" for the admin list.
 *
 * The jobs feed, the select-all-matching id query and the facet counts all build
 * their WHERE clause from here. If they each hand-rolled it, "select all 1,240
 * matching" would eventually select a different set than the table displays.
 */
export const adminJobFilterSchema = z.object({
  /** Free text across title, description and company name. */
  q: z.string().trim().max(200).optional(),
  /** An empty array means "no status filter", not "match nothing". */
  status: z.array(z.enum(JOB_STATUS)).optional(),
  // Normalised then validated: an un-normalised 'DUBAI' previously passed the
  // string check and matched zero rows — a silently wrong result, not an error.
  emirate: z
    .array(z.string().max(40))
    .transform((arr) => arr.map((e) => toEmirateSlug(e)).filter((e): e is string => !!e))
    .optional(),
  /** AED. Matched as an overlap against the job's own salary band. */
  salaryMin: z.number().int().min(0).max(1_000_000).optional(),
  salaryMax: z.number().int().min(0).max(1_000_000).optional(),
  /** Company name substring. */
  company: z.string().trim().max(120).optional(),
  source: z.array(z.string().max(40)).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  /** Exclude jobs that publish no salary figures at all. */
  salaryDisclosedOnly: z.boolean().optional(),
});

export type AdminJobFilters = z.infer<typeof adminJobFilterSchema>;

/** Escape LIKE wildcards so a literal % or _ in a search term can't match everything. */
export function likeTerm(raw: string): string {
  return `%${raw.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Jobs whose company name matches, as a subquery.
 *
 * A subquery rather than a join, because the jobs feed uses drizzle's relational
 * `findMany`, which takes a plain condition and cannot express a join here.
 */
function companyNameMatches(term: string): SQL {
  return inArray(
    jobs.companyId,
    db.select({ id: companies.id }).from(companies).where(ilike(companies.name, term)),
  );
}

/**
 * Build the SQL conditions for a filter set.
 *
 * `omit` skips one facet's own condition. A facet's counts must be computed
 * against every *other* filter — otherwise selecting "Dubai" reports 0 for every
 * other emirate, and the facet can only ever narrow, never redirect.
 */
export function buildJobFilterConditions(f: AdminJobFilters, omit?: keyof AdminJobFilters): SQL[] {
  const conds: SQL[] = [];
  const use = (k: keyof AdminJobFilters) => omit !== k;

  if (use('q') && f.q) {
    const term = likeTerm(f.q);
    conds.push(or(ilike(jobs.title, term), ilike(jobs.description, term), companyNameMatches(term))!);
  }

  if (use('status') && f.status?.length) conds.push(inArray(jobs.status, f.status));
  if (use('emirate') && f.emirate?.length) conds.push(inArray(jobs.emirateSlug, f.emirate));
  if (use('source') && f.source?.length) conds.push(inArray(jobs.source, f.source));
  if (use('company') && f.company) conds.push(companyNameMatches(likeTerm(f.company)));

  // Range overlap: the job's [min,max] band intersects the requested band, so a
  // job paying 4k–8k does match "at least 5k" — part of its range qualifies.
  if (use('salaryMin') && f.salaryMin !== undefined) {
    conds.push(or(gte(jobs.salaryMax, f.salaryMin), gte(jobs.salaryMin, f.salaryMin))!);
  }
  if (use('salaryMax') && f.salaryMax !== undefined) {
    conds.push(or(lte(jobs.salaryMin, f.salaryMax), lte(jobs.salaryMax, f.salaryMax))!);
  }
  if (use('salaryDisclosedOnly') && f.salaryDisclosedOnly) {
    conds.push(or(isNotNull(jobs.salaryMin), isNotNull(jobs.salaryMax))!);
  }

  if (use('dateFrom') && f.dateFrom) conds.push(gte(jobs.createdAt, f.dateFrom));
  if (use('dateTo') && f.dateTo) conds.push(lte(jobs.createdAt, f.dateTo));

  return conds;
}

/** Combined WHERE, or undefined when nothing is being filtered. */
export function buildJobWhere(f: AdminJobFilters, omit?: keyof AdminJobFilters): SQL | undefined {
  const conds = buildJobFilterConditions(f, omit);
  return conds.length ? and(...conds) : undefined;
}
