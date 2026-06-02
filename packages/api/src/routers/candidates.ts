import { z } from 'zod';
import { jobseekerProfiles, users, eq, and, desc, sql } from '@ddots/db';
import { router, employerProcedure } from '../trpc';

/** Employer candidate search over open-to-work jobseeker profiles. */
export const candidatesRouter = router({
  search: employerProcedure
    .input(
      z.object({
        q: z.string().max(120).optional(),
        category: z.string().optional(),
        emirate: z.string().optional(),
        experienceLevel: z.string().optional(),
        page: z.number().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conds = [eq(jobseekerProfiles.openToWork, true)];
      if (input.category) conds.push(eq(jobseekerProfiles.categorySlug, input.category));
      if (input.emirate) conds.push(eq(jobseekerProfiles.emirateSlug, input.emirate));
      if (input.experienceLevel) conds.push(eq(jobseekerProfiles.experienceLevel, input.experienceLevel as never));
      if (input.q) {
        conds.push(
          sql`(${jobseekerProfiles.headline} ILIKE ${'%' + input.q + '%'} OR ${jobseekerProfiles.skills}::text ILIKE ${'%' + input.q + '%'})`,
        );
      }

      const rows = await ctx.db
        .select({
          userId: jobseekerProfiles.userId,
          name: users.name,
          image: users.image,
          headline: jobseekerProfiles.headline,
          categorySlug: jobseekerProfiles.categorySlug,
          emirateSlug: jobseekerProfiles.emirateSlug,
          experienceLevel: jobseekerProfiles.experienceLevel,
          visaStatus: jobseekerProfiles.visaStatus,
          skills: jobseekerProfiles.skills,
          resumeUrl: jobseekerProfiles.resumeUrl,
        })
        .from(jobseekerProfiles)
        .innerJoin(users, eq(users.id, jobseekerProfiles.userId))
        .where(and(...conds))
        .orderBy(desc(jobseekerProfiles.updatedAt))
        .limit(24)
        .offset((input.page - 1) * 24);

      return rows;
    }),
});
