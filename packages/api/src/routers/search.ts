import { createHash } from 'node:crypto';
import { z } from 'zod';
import { users, jobseekerProfiles, cvScores, eq, and, sql } from '@ddots/db';
import { router, publicProcedure, employerProcedure } from '../trpc';
import { getTypesense, JOBS_COLLECTION } from '../lib/typesense';
import { scoreCV, scoreBySkillOverlap } from '../lib/ats-scorer';

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

  /**
   * Employer CV search with deterministic ATS scoring (Phase 2A). Filters searchable CVs,
   * scores each against an optional job description (or skill-overlap when none), sorts by
   * combined score, and caches scores in cv_scores (dedup on cv_id + job-description hash).
   * Gated to employers — the rows carry candidate PII.
   */
  searchCVsWithScoring: employerProcedure
    .input(
      z.object({
        skills: z.array(z.string().min(1).max(50)).max(10).optional(),
        location: z.string().max(80).optional(),
        min_experience: z.coerce.number().min(0).max(60).optional(),
        job_description: z.string().max(5000).optional(),
        limit: z.number().int().min(1).max(48).default(24),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conds = [eq(users.cvSearchable, true)];
      for (const s of input.skills ?? []) conds.push(sql`${users.cvMetadata} ->> 'skills' ILIKE ${`%${s}%`}`);
      if (input.location) conds.push(sql`${users.cvMetadata} ->> 'location' ILIKE ${`%${input.location}%`}`);
      if (input.min_experience) conds.push(sql`COALESCE((${users.cvMetadata} ->> 'experience')::numeric, 0) >= ${input.min_experience}`);

      const rows = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          image: users.image,
          cvMetadata: users.cvMetadata,
          createdAt: users.createdAt,
          resumeUrl: jobseekerProfiles.resumeUrl,
          phone: jobseekerProfiles.phone,
          headline: jobseekerProfiles.headline,
        })
        .from(users)
        .leftJoin(jobseekerProfiles, eq(jobseekerProfiles.userId, users.id))
        .where(and(...conds))
        .limit(input.limit);

      const jd = input.job_description?.trim();
      const hash = jd ? createHash('sha256').update(jd).digest('hex') : null;

      const scored = await Promise.all(
        rows.map(async (u) => {
          const cv = { skills: u.cvMetadata?.skills ?? [], experience_years: u.cvMetadata?.experience ?? 0 };
          const s = jd ? scoreCV(cv, jd) : scoreBySkillOverlap(cv, input.skills ?? []);
          if (hash) {
            const set = {
              keywordMatchPct: s.keyword_match_pct,
              experienceMatchPct: s.experience_match_pct,
              combinedScore: s.combined_score_pct,
              matchedSkills: s.matched_skills,
              missingSkills: s.missing_skills,
              scoredAt: new Date(),
            };
            await ctx.db
              .insert(cvScores)
              .values({ cvId: u.id, jobDescriptionHash: hash, ...set })
              .onConflictDoUpdate({ target: [cvScores.cvId, cvScores.jobDescriptionHash], set });
          }
          return {
            ...u,
            ats_score: s.combined_score_pct,
            keyword_match: s.keyword_match_pct,
            experience_match: s.experience_match_pct,
            matched_skills: s.matched_skills,
            missing_skills: s.missing_skills,
          };
        }),
      );
      scored.sort((a, b) => b.ats_score - a.ats_score);
      return scored;
    }),
});
