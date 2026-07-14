import { z } from 'zod';
import { jobseekerProfiles, users, eq, and, ne, desc, ilike, gte, sql } from '@ddots/db';
import { router, employerProcedure } from '../trpc';

/** Employer candidate search over open-to-work jobseeker profiles. Respects privacy toggles. */
export const candidatesRouter = router({
  search: employerProcedure
    .input(
      z.object({
        q: z.string().max(120).optional(),
        category: z.string().optional(),
        emirate: z.string().optional(),
        experienceLevel: z.string().optional(),
        nationality: z.string().max(100).optional(),
        visaStatus: z.string().max(30).optional(),
        skills: z.array(z.string().max(50)).max(10).optional(),
        salaryMax: z.coerce.number().int().positive().optional(),
        experienceYears: z.coerce.number().int().min(0).optional(),
        page: z.number().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Only open-to-work and non-hidden profiles are searchable.
      const conds = [eq(jobseekerProfiles.openToWork, true), ne(jobseekerProfiles.visibility, 'hidden')];
      if (input.category) conds.push(eq(jobseekerProfiles.categorySlug, input.category));
      if (input.emirate) conds.push(eq(jobseekerProfiles.emirateSlug, input.emirate));
      if (input.experienceLevel) conds.push(eq(jobseekerProfiles.experienceLevel, input.experienceLevel as never));
      if (input.nationality) conds.push(ilike(jobseekerProfiles.nationality, `%${input.nationality}%`));
      if (input.visaStatus) conds.push(eq(jobseekerProfiles.visaStatus, input.visaStatus as never));
      if (input.experienceYears) conds.push(gte(jobseekerProfiles.yearsExperience, input.experienceYears));
      if (input.salaryMax) conds.push(sql`(${jobseekerProfiles.expectedSalaryMin} IS NULL OR ${jobseekerProfiles.expectedSalaryMin} <= ${input.salaryMax})`);
      if (input.skills?.length) for (const s of input.skills) conds.push(sql`${jobseekerProfiles.skills}::text ILIKE ${'%' + s + '%'}`);
      if (input.q) {
        conds.push(
          sql`(${jobseekerProfiles.headline} ILIKE ${'%' + input.q + '%'} OR ${jobseekerProfiles.skills}::text ILIKE ${'%' + input.q + '%'})`,
        );
      }

      const rows = await ctx.db
        .select({
          userId: jobseekerProfiles.userId,
          username: jobseekerProfiles.username,
          name: users.name,
          image: users.image,
          headline: jobseekerProfiles.headline,
          categorySlug: jobseekerProfiles.categorySlug,
          emirateSlug: jobseekerProfiles.emirateSlug,
          experienceLevel: jobseekerProfiles.experienceLevel,
          yearsExperience: jobseekerProfiles.yearsExperience,
          visaStatus: jobseekerProfiles.visaStatus,
          nationality: jobseekerProfiles.nationality,
          availabilityStatus: jobseekerProfiles.availabilityStatus,
          skills: jobseekerProfiles.skills,
          resumeUrl: jobseekerProfiles.resumeUrl,
          lastActive: jobseekerProfiles.lastActive,
          phone: jobseekerProfiles.phone,
          showWhatsapp: jobseekerProfiles.showWhatsapp,
          showSalary: jobseekerProfiles.showSalary,
          expectedSalaryMin: jobseekerProfiles.expectedSalaryMin,
          expectedSalaryMax: jobseekerProfiles.expectedSalaryMax,
        })
        .from(jobseekerProfiles)
        .innerJoin(users, eq(users.id, jobseekerProfiles.userId))
        .where(and(...conds))
        .orderBy(desc(jobseekerProfiles.lastActive))
        .limit(24)
        .offset((input.page - 1) * 24);

      // Gate contact by the candidate's own toggles (WhatsApp only if opted in; salary if opted in).
      return rows.map((r) => ({
        userId: r.userId, username: r.username, name: r.name, image: r.image,
        headline: r.headline, categorySlug: r.categorySlug, emirateSlug: r.emirateSlug,
        experienceLevel: r.experienceLevel, yearsExperience: r.yearsExperience,
        visaStatus: r.visaStatus, nationality: r.nationality, availabilityStatus: r.availabilityStatus,
        skills: r.skills, resumeUrl: r.resumeUrl, lastActive: r.lastActive,
        whatsapp: r.showWhatsapp ? r.phone : null,
        salary: r.showSalary ? { min: r.expectedSalaryMin, max: r.expectedSalaryMax } : null,
      }));
    }),
});
