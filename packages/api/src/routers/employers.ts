import { z } from 'zod';
import { employerProfiles, jobs, applications, eq, and, count, desc, sql, inArray } from '@ddots/db';
import { employerProfileSchema } from '@ddots/shared';
import { router, employerProcedure } from '../trpc';
import { presignUpload } from '../lib/r2';
import { audit } from '../lib/helpers';

export const employersRouter = router({
  me: employerProcedure.query(async ({ ctx }) => {
    return (
      (await ctx.db.query.employerProfiles.findFirst({
        where: eq(employerProfiles.userId, ctx.session.user.id),
      })) ?? null
    );
  }),

  upsertProfile: employerProcedure.input(employerProfileSchema).mutation(async ({ ctx, input }) => {
    const [profile] = await ctx.db
      .insert(employerProfiles)
      .values({ userId: ctx.session.user.id, ...input })
      .onConflictDoUpdate({ target: employerProfiles.userId, set: input })
      .returning();
    return profile;
  }),

  /** Dashboard analytics: totals + recent applications. */
  dashboard: employerProcedure.query(async ({ ctx }) => {
    const myJobs = await ctx.db.query.jobs.findMany({
      where: eq(jobs.employerId, ctx.session.user.id),
      columns: { id: true, status: true, viewCount: true, applicationCount: true },
    });
    const jobIds = myJobs.map((j) => j.id);
    const totals = {
      jobs: myJobs.length,
      active: myJobs.filter((j) => j.status === 'active').length,
      pending: myJobs.filter((j) => j.status === 'pending').length,
      views: myJobs.reduce((s, j) => s + j.viewCount, 0),
      applications: myJobs.reduce((s, j) => s + j.applicationCount, 0),
    };

    const recentApps = jobIds.length
      ? await ctx.db.query.applications.findMany({
          where: inArray(applications.jobId, jobIds),
          orderBy: [desc(applications.createdAt)],
          limit: 10,
          with: {
            seeker: { columns: { name: true, image: true } },
            job: { columns: { title: true } },
          },
        })
      : [];

    return { totals, recentApps };
  }),

  presignLogo: employerProcedure
    .input(z.object({ filename: z.string().max(200), contentType: z.string().max(100) }))
    .mutation(async ({ ctx, input }) => {
      const ext = input.filename.split('.').pop() ?? 'png';
      const key = `logos/${ctx.session.user.id}/${Date.now()}.${ext}`;
      return presignUpload(key, input.contentType);
    }),

  /** Applications-per-day for the employer's jobs over the last 14 days. */
  analyticsSeries: employerProcedure.query(async ({ ctx }) => {
    const rows = (await ctx.db.execute(sql`
      SELECT to_char(d::date,'Mon DD') AS label, COALESCE(c.cnt,0)::int AS value
      FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') d
      LEFT JOIN (
        SELECT a.created_at::date dt, count(*) cnt
        FROM applications a JOIN jobs j ON j.id = a.job_id
        WHERE j.employer_id = ${ctx.session.user.id}
        GROUP BY 1
      ) c ON c.dt = d::date
      ORDER BY d
    `)) as unknown as { rows?: { label: string; value: number }[] } | { label: string; value: number }[];
    return (Array.isArray(rows) ? rows : (rows.rows ?? [])) as { label: string; value: number }[];
  }),

  /** Per-job analytics breakdown (views, applicants, conversion). */
  analytics: employerProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.jobs.findMany({
      where: eq(jobs.employerId, ctx.session.user.id),
      columns: { id: true, title: true, status: true, viewCount: true, applicationCount: true, publishedAt: true },
      orderBy: [desc(jobs.publishedAt)],
    });
    const perJob = rows.map((j) => ({
      ...j,
      conversion: j.viewCount > 0 ? Math.round((j.applicationCount / j.viewCount) * 100) : 0,
    }));
    const totals = {
      views: rows.reduce((s, j) => s + j.viewCount, 0),
      applications: rows.reduce((s, j) => s + j.applicationCount, 0),
      avgConversion: perJob.length ? Math.round(perJob.reduce((s, j) => s + j.conversion, 0) / perJob.length) : 0,
    };
    return { perJob, totals };
  }),

  /** Submit (or resubmit) company verification documents. */
  submitVerification: employerProcedure
    .input(z.object({ tradeLicenseNo: z.string().max(80), docUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(employerProfiles)
        .set({
          tradeLicenseNo: input.tradeLicenseNo,
          verificationDocUrl: input.docUrl,
          verificationStatus: 'pending',
          verificationNote: null,
        })
        .where(eq(employerProfiles.userId, ctx.session.user.id));
      await audit(ctx.session.user.id, 'employer.verify.submit', 'employer', ctx.session.user.id);
      return { status: 'pending' };
    }),

  presignVerificationDoc: employerProcedure
    .input(z.object({ filename: z.string().max(200), contentType: z.string().max(100) }))
    .mutation(async ({ ctx, input }) => {
      const ext = input.filename.split('.').pop() ?? 'pdf';
      const key = `verification/${ctx.session.user.id}/${Date.now()}.${ext}`;
      return presignUpload(key, input.contentType);
    }),
});
