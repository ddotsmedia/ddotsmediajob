import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { getTypesense, JOBS_COLLECTION } from '../lib/typesense';

/** Typesense-backed full-text search with facets, falling back gracefully. */
export const searchRouter = router({
  jobs: publicProcedure
    .input(
      z.object({
        q: z.string().default('*'),
        category: z.string().optional(),
        emirate: z.string().optional(),
        jobType: z.string().optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input }) => {
      const filters: string[] = [];
      if (input.category) filters.push(`categorySlug:=${input.category}`);
      if (input.emirate) filters.push(`emirateSlug:=${input.emirate}`);
      if (input.jobType) filters.push(`jobType:=${input.jobType}`);

      try {
        const res = await getTypesense()
          .collections(JOBS_COLLECTION)
          .documents()
          .search({
            q: input.q || '*',
            query_by: 'title,description,companyName,skills',
            filter_by: filters.join(' && ') || undefined,
            facet_by: 'categorySlug,emirateSlug,jobType,experienceLevel',
            sort_by: input.q && input.q !== '*' ? '_text_match:desc,publishedAt:desc' : 'publishedAt:desc',
            page: input.page,
            per_page: input.perPage,
          });
        return {
          hits: (res.hits ?? []).map((h: { document: unknown }) => h.document),
          found: res.found,
          facets: res.facet_counts ?? [],
          available: true,
        };
      } catch (err) {
        console.error('[search] typesense unavailable', err);
        return { hits: [], found: 0, facets: [], available: false };
      }
    }),
});
