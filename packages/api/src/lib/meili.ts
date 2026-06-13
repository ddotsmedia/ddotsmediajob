/**
 * Thin API-side wrapper over @ddots/search: re-exports the client and maps a
 * Drizzle job row → Meilisearch JobDoc.
 */
import type { JobDoc } from '@ddots/search';

export * from '@ddots/search';

type JobRowLike = {
  id: string;
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  emirateSlug: string;
  jobType: string;
  skills?: string[] | null;
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  visaProvided?: boolean | null;
  accommodationProvided?: boolean | null;
  isFresher?: boolean | null;
  isUrgent?: boolean | null;
  isFeatured?: boolean | null;
  applicationCount?: number | null;
  createdAt: Date | string;
};

export function jobRowToDoc(row: JobRowLike, companyName?: string | null): JobDoc {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description.slice(0, 4000),
    company: companyName ?? null,
    category: row.categorySlug,
    emirate: row.emirateSlug,
    jobType: row.jobType,
    tags: row.skills ?? [],
    status: row.status,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    visaProvided: !!row.visaProvided,
    accommodation: !!row.accommodationProvided,
    freshersWelcome: !!row.isFresher,
    urgent: !!row.isUrgent,
    featured: !!row.isFeatured,
    applicantCount: row.applicationCount ?? 0,
    createdAt: new Date(row.createdAt).getTime(),
  };
}
