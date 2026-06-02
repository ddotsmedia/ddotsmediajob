import { Client as TypesenseClient } from 'typesense';
import type { jobs } from '@ddots/db';

export const JOBS_COLLECTION = 'jobs';

let client: TypesenseClient | null = null;

export function getTypesense(): TypesenseClient {
  if (client) return client;
  client = new TypesenseClient({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST ?? 'localhost',
        port: Number(process.env.TYPESENSE_PORT ?? 8108),
        protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
      },
    ],
    apiKey: process.env.TYPESENSE_API_KEY ?? 'xyz',
    connectionTimeoutSeconds: 5,
  });
  return client;
}

export const jobsCollectionSchema = {
  name: JOBS_COLLECTION,
  fields: [
    { name: 'title', type: 'string' as const },
    { name: 'description', type: 'string' as const },
    { name: 'companyName', type: 'string' as const, optional: true, facet: true },
    { name: 'categorySlug', type: 'string' as const, facet: true },
    { name: 'emirateSlug', type: 'string' as const, facet: true },
    { name: 'jobType', type: 'string' as const, facet: true },
    { name: 'experienceLevel', type: 'string' as const, facet: true },
    { name: 'visaStatus', type: 'string' as const, facet: true },
    { name: 'skills', type: 'string[]' as const, facet: true, optional: true },
    { name: 'salaryMin', type: 'int32' as const, optional: true },
    { name: 'salaryMax', type: 'int32' as const, optional: true },
    { name: 'isRemote', type: 'bool' as const, facet: true },
    { name: 'isFresher', type: 'bool' as const, facet: true },
    { name: 'isUrgent', type: 'bool' as const, facet: true },
    { name: 'isFeatured', type: 'bool' as const, facet: true },
    { name: 'publishedAt', type: 'int64' as const },
  ],
  default_sorting_field: 'publishedAt',
};

export type JobDocument = {
  id: string;
  slug: string;
  title: string;
  description: string;
  companyName?: string;
  categorySlug: string;
  emirateSlug: string;
  jobType: string;
  experienceLevel: string;
  visaStatus: string;
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  isRemote: boolean;
  isFresher: boolean;
  isUrgent: boolean;
  isFeatured: boolean;
  publishedAt: number;
};

export function jobToDocument(
  job: typeof jobs.$inferSelect,
  companyName?: string | null,
): JobDocument {
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    description: job.description.slice(0, 2000),
    companyName: companyName ?? undefined,
    categorySlug: job.categorySlug,
    emirateSlug: job.emirateSlug,
    jobType: job.jobType,
    experienceLevel: job.experienceLevel,
    visaStatus: job.visaStatus,
    skills: job.skills ?? [],
    salaryMin: job.salaryMin ?? undefined,
    salaryMax: job.salaryMax ?? undefined,
    isRemote: job.isRemote,
    isFresher: job.isFresher,
    isUrgent: job.isUrgent,
    isFeatured: job.isFeatured,
    publishedAt: Math.floor((job.publishedAt ?? job.createdAt).getTime() / 1000),
  };
}

/** Create the jobs collection if it does not exist. Safe to call repeatedly. */
export async function ensureJobsCollection(): Promise<void> {
  const ts = getTypesense();
  try {
    await ts.collections(JOBS_COLLECTION).retrieve();
  } catch {
    await ts.collections().create(jobsCollectionSchema);
  }
}

export async function upsertJobDocument(doc: JobDocument): Promise<void> {
  try {
    await getTypesense().collections(JOBS_COLLECTION).documents().upsert(doc);
  } catch (err) {
    console.error('[typesense] upsert failed', err);
  }
}

export async function deleteJobDocument(id: string): Promise<void> {
  try {
    await getTypesense().collections(JOBS_COLLECTION).documents(id).delete();
  } catch {
    /* document may not exist — ignore */
  }
}
