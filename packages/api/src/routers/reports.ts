import { z } from 'zod';
import { jobReports, jobs, eq, desc } from '@ddots/db';
import { REPORT_REASONS, REPORT_STATUSES } from '@ddots/shared';
import { router, publicProcedure, adminProcedure } from '../trpc';
import { enforceRateLimit } from '../lib/security';

const ipOf = (ctx: { headers?: Headers }) => ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

/** Job/employer reports → admin moderation queue (audit Phase 9). Reporter identity is stored
 * for abuse handling but never returned to employers (employers can't reach this router at all). */
export const reportsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        jobId: z.string().uuid(),
        reason: z.enum(REPORT_REASONS),
        details: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ip = ipOf(ctx);
      await enforceRateLimit(`report:${ip}`, 10, 3600); // 10/hr per IP
      const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId), columns: { id: true } });
      if (!job) return { ok: true }; // generic — don't reveal which ids exist
      await ctx.db.insert(jobReports).values({
        jobId: input.jobId,
        reporterId: ctx.session?.user?.id ?? null,
        reason: input.reason,
        details: input.details,
        reporterIp: ip,
      });
      return { ok: true };
    }),

  /** Admin moderation queue. Reporter identity intentionally omitted from the output. */
  list: adminProcedure
    .input(z.object({ status: z.enum(REPORT_STATUSES).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const base = ctx.db
        .select({
          id: jobReports.id,
          jobId: jobReports.jobId,
          reason: jobReports.reason,
          details: jobReports.details,
          status: jobReports.status,
          createdAt: jobReports.createdAt,
          jobSlug: jobs.slug,
          jobTitle: jobs.title,
        })
        .from(jobReports)
        .leftJoin(jobs, eq(jobs.id, jobReports.jobId))
        .orderBy(desc(jobReports.createdAt))
        .limit(100);
      return input?.status ? base.where(eq(jobReports.status, input.status)) : base;
    }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(REPORT_STATUSES) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(jobReports).set({ status: input.status }).where(eq(jobReports.id, input.id));
      return { ok: true };
    }),
});
