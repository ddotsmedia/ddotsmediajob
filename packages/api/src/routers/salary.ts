import { z } from 'zod';
import { salarySubmissions, salaryAggregates, sql } from '@ddots/db';
import { router, publicProcedure } from '../trpc';
import { normalizeJobTitle, type ExperienceLevel } from '../lib/salary-normalizer';
import { enforceRateLimit } from '../lib/security';

const ipOf = (ctx: { headers?: Headers }) => ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

/** Recompute the cached aggregate (median/avg/percentiles) for one (title, emirate, level) bucket. */
async function refreshAggregate(db: typeof import('@ddots/db').db, normalizedTitle: string, emirate: string, level: string): Promise<void> {
  const res = await db.execute(sql`
    SELECT count(*)::int AS count,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY monthly_salary_aed)::int AS median,
      avg(monthly_salary_aed)::int AS average,
      min(monthly_salary_aed)::int AS min, max(monthly_salary_aed)::int AS max,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY monthly_salary_aed)::int AS p25,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY monthly_salary_aed)::int AS p75
    FROM salary_submissions
    WHERE normalized_title = ${normalizedTitle} AND COALESCE(emirate, 'unknown') = ${emirate} AND experience_level = ${level}
  `);
  const r = ((res as unknown as { rows?: unknown[] }).rows ?? (res as unknown as unknown[]))[0] as
    | { count: number; median: number | null; average: number | null; min: number | null; max: number | null; p25: number | null; p75: number | null }
    | undefined;
  if (!r || r.count === 0) return;
  await db
    .insert(salaryAggregates)
    .values({
      normalizedJobTitle: normalizedTitle, emirate, experienceLevel: level, count: r.count,
      medianAed: r.median, averageAed: r.average, minAed: r.min, maxAed: r.max,
      percentile25: r.p25, percentile75: r.p75, lastUpdatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [salaryAggregates.normalizedJobTitle, salaryAggregates.emirate, salaryAggregates.experienceLevel],
      set: { count: r.count, medianAed: r.median, averageAed: r.average, minAed: r.min, maxAed: r.max, percentile25: r.p25, percentile75: r.p75, lastUpdatedAt: new Date() },
    });
}

export const salaryRouter = router({
  submitSalary: publicProcedure
    .input(
      z.object({
        jobTitle: z.string().trim().min(2).max(160),
        industry: z.string().trim().max(120).optional(),
        emirate: z.string().trim().max(40).optional(),
        city: z.string().trim().max(80).optional(),
        monthlyAed: z.number().int().min(1000).max(1_000_000),
        experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']),
        educationLevel: z.enum(['high_school', 'diploma', 'bachelor', 'master', 'phd']).optional(),
        employmentType: z.enum(['full_time', 'part_time', 'contract', 'freelance']).optional(),
        benefits: z.object({ health: z.boolean().optional(), transport: z.boolean().optional(), bonus: z.boolean().optional(), leaveDays: z.number().int().min(0).max(365).optional() }).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`salary:${ipOf(ctx)}`, 10, 3600); // 10/hr per IP
      const normalizedTitle = normalizeJobTitle(input.jobTitle);
      const emirate = input.emirate?.trim() || null;
      const role = ctx.session?.user?.role;
      const dataSource = role === 'employer' ? 'employer' : 'jobseeker';

      await ctx.db.insert(salarySubmissions).values({
        jobTitle: input.jobTitle,
        normalizedTitle,
        industry: input.industry,
        emirate,
        city: input.city,
        experienceLevel: input.experienceLevel satisfies ExperienceLevel,
        educationLevel: input.educationLevel,
        employmentType: input.employmentType,
        monthlySalaryAed: input.monthlyAed,
        annualSalaryAed: input.monthlyAed * 12,
        benefits: input.benefits ?? {},
        submittedById: ctx.session?.user?.id ?? null,
        dataSource,
      });

      // Refresh the affected aggregate bucket immediately (hourly cron can rebuild all).
      await refreshAggregate(ctx.db, normalizedTitle, emirate ?? 'unknown', input.experienceLevel).catch(() => {});
      return { success: true, message: 'Thanks — your salary helps others negotiate fairly.' };
    }),
});
