import { z } from 'zod';
import { users, jobseekerProfiles, eq, and, desc, sql } from '@ddots/db';
import { router, protectedProcedure, employerProcedure } from '../trpc';
import { parseResume, EMPTY_CV_METADATA } from '../lib/resume-parser';

/**
 * Employer CV search over users.cv_metadata (opt-in via users.cv_searchable).
 * NOTE: kept `employerProcedure`, NOT public as the task suggested — the result set
 * exposes candidate name, image, phone and a direct resume-download URL. "Searchable
 * by employers" is not consent to open, scrapable exposure of that PII. The page is
 * already employer-gated; the endpoint must be too.
 */
export const cvsRouter = router({
  search: employerProcedure
    .input(
      z.object({
        skills: z.array(z.string().min(1).max(50)).max(10).optional(),
        location: z.string().max(80).optional(),
        experience: z.coerce.number().min(0).max(60).optional(),
        limit: z.number().int().min(1).max(48).default(24),
        page: z.number().int().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conds = [eq(users.cvSearchable, true)];
      // ILIKE over the serialized jsonb arrays: case-insensitive + partial matches
      // ("photoshop" finds "Adobe Photoshop"), which @> exact containment can't do.
      for (const s of input.skills ?? []) {
        conds.push(sql`${users.cvMetadata} ->> 'skills' ILIKE ${`%${s}%`}`);
      }
      if (input.location) {
        conds.push(sql`${users.cvMetadata} ->> 'location' ILIKE ${`%${input.location}%`}`);
      }
      if (input.experience) {
        conds.push(sql`COALESCE((${users.cvMetadata} ->> 'experience')::numeric, 0) >= ${input.experience}`);
      }
      return ctx.db
        .select({
          id: users.id,
          name: users.name,
          image: users.image,
          role: users.role,
          cvMetadata: users.cvMetadata,
          createdAt: users.createdAt,
          resumeUrl: jobseekerProfiles.resumeUrl,
          phone: jobseekerProfiles.phone,
          headline: jobseekerProfiles.headline,
        })
        .from(users)
        .leftJoin(jobseekerProfiles, eq(jobseekerProfiles.userId, users.id))
        .where(and(...conds))
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);
    }),

  /** Distinct skills across searchable CVs — powers the skills autocomplete on the search page. */
  skillOptions: employerProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute<{ skill: string }>(sql`
      SELECT DISTINCT trim(both '"' from skill) AS skill
      FROM ${users}, jsonb_array_elements_text(${users.cvMetadata} -> 'skills') AS skill
      WHERE ${users.cvSearchable} = true AND length(trim(skill)) > 0
      ORDER BY skill
      LIMIT 200
    `);
    const list = (rows as unknown as { rows?: { skill: string }[] }).rows ?? (rows as unknown as { skill: string }[]);
    return list.map((r) => r.skill).filter(Boolean);
  }),

  /**
   * (Re)parse the signed-in user's CV into users.cv_metadata. Upload UIs call this right
   * after a CV lands so the extraction is explicit + observable ("Parsing CV…"), not a
   * silent background job. Reads resumeUrl server-side (never trusts a client-supplied URL).
   */
  parseCv: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const profile = await ctx.db.query.jobseekerProfiles.findFirst({
      where: eq(jobseekerProfiles.userId, userId),
      columns: { resumeUrl: true },
    });
    if (!profile?.resumeUrl) return { parsed: false, metadata: EMPTY_CV_METADATA };
    const metadata = await parseResume(profile.resumeUrl); // never throws
    await ctx.db.update(users).set({ cvMetadata: metadata }).where(eq(users.id, userId));
    return { parsed: true, metadata };
  }),

  /** Current user's opt-in status (drives the profile toggle). */
  myStatus: protectedProcedure.query(async ({ ctx }) => {
    const u = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
      columns: { cvSearchable: true },
    });
    return { cvSearchable: u?.cvSearchable ?? false };
  }),

  /** Jobseeker opts their CV in/out of employer search. Opting in (re)parses the CV. */
  makeSearchable: protectedProcedure
    .input(z.object({ cvSearchable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.db.update(users).set({ cvSearchable: input.cvSearchable }).where(eq(users.id, userId));
      if (input.cvSearchable) {
        const profile = await ctx.db.query.jobseekerProfiles.findFirst({
          where: eq(jobseekerProfiles.userId, userId),
          columns: { resumeUrl: true },
        });
        if (profile?.resumeUrl) {
          // parseResume never throws — worst case it stores empty defaults.
          const meta = await parseResume(profile.resumeUrl);
          await ctx.db.update(users).set({ cvMetadata: meta }).where(eq(users.id, userId));
        }
      }
      return { cvSearchable: input.cvSearchable };
    }),
});
