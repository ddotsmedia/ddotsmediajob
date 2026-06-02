import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  jobs,
  users,
  applications,
  companies,
  blogPosts,
  employerProfiles,
  auditLogs,
  eq,
  and,
  desc,
  count,
  sql,
} from '@ddots/db';
import { router, adminProcedure } from '../trpc';
import { audit } from '../lib/helpers';
import { enqueueEmail, enqueueSearchSync } from '../lib/queue';

export const adminRouter = router({
  /** Dashboard stats. */
  stats: adminProcedure.query(async ({ ctx }) => {
    const [j, u, a, c, pending] = await Promise.all([
      ctx.db.select({ v: count() }).from(jobs),
      ctx.db.select({ v: count() }).from(users),
      ctx.db.select({ v: count() }).from(applications),
      ctx.db.select({ v: count() }).from(companies),
      ctx.db.select({ v: count() }).from(jobs).where(eq(jobs.status, 'pending')),
    ]);
    return {
      jobs: j[0]?.v ?? 0,
      users: u[0]?.v ?? 0,
      applications: a[0]?.v ?? 0,
      companies: c[0]?.v ?? 0,
      pendingJobs: pending[0]?.v ?? 0,
    };
  }),

  /** Approval queue. */
  pendingJobs: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.jobs.findMany({
      where: eq(jobs.status, 'pending'),
      orderBy: [desc(jobs.createdAt)],
      with: {
        company: { columns: { name: true } },
        employer: { columns: { name: true, email: true } },
      },
    }),
  ),

  approveJob: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const job = await ctx.db.query.jobs.findFirst({
      where: eq(jobs.id, input.id),
      with: { employer: { columns: { name: true, email: true } } },
    });
    if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
    await ctx.db
      .update(jobs)
      .set({ status: 'active', publishedAt: new Date(), rejectionReason: null })
      .where(eq(jobs.id, input.id));
    await enqueueSearchSync({ type: 'upsert', jobId: input.id });
    if (job.employer?.email) {
      await enqueueEmail({
        type: 'job-approved',
        to: job.employer.email,
        name: job.employer.name ?? 'there',
        jobTitle: job.title,
        jobUrl: `${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.slug}`,
      });
    }
    await audit(ctx.session.user.id, 'job.approve', 'job', input.id);
    return { ok: true };
  }),

  rejectJob: adminProcedure
    .input(z.object({ id: z.string().uuid(), reason: z.string().max(500) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(jobs)
        .set({ status: 'rejected', rejectionReason: input.reason })
        .where(eq(jobs.id, input.id));
      await enqueueSearchSync({ type: 'delete', jobId: input.id });
      await audit(ctx.session.user.id, 'job.reject', 'job', input.id, { reason: input.reason });
      return { ok: true };
    }),

  /** User management. */
  users: adminProcedure
    .input(z.object({ q: z.string().optional(), page: z.number().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      const where = input.q ? sql`${users.email} ILIKE ${'%' + input.q + '%'}` : undefined;
      const rows = await ctx.db.query.users.findMany({
        where,
        orderBy: [desc(users.createdAt)],
        limit: 25,
        offset: (input.page - 1) * 25,
        columns: { id: true, name: true, email: true, role: true, isBanned: true, createdAt: true },
      });
      return rows;
    }),

  setUserBan: adminProcedure
    .input(z.object({ userId: z.string().uuid(), banned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set({ isBanned: input.banned }).where(eq(users.id, input.userId));
      await audit(ctx.session.user.id, 'user.ban', 'user', input.userId, { banned: input.banned });
      return { ok: true };
    }),

  setUserRole: adminProcedure
    .input(z.object({ userId: z.string().uuid(), role: z.enum(['jobseeker', 'employer', 'admin']) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      await audit(ctx.session.user.id, 'user.role', 'user', input.userId, { role: input.role });
      return { ok: true };
    }),

  auditLog: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.auditLogs.findMany({ orderBy: [desc(auditLogs.createdAt)], limit: 100 }),
  ),

  // ── Employer verification queue ────────────────────────
  pendingVerifications: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.employerProfiles.findMany({
      where: eq(employerProfiles.verificationStatus, 'pending'),
      orderBy: [desc(employerProfiles.updatedAt)],
    }),
  ),

  reviewVerification: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(employerProfiles)
        .set({
          verificationStatus: input.approve ? 'verified' : 'rejected',
          isVerified: input.approve,
          verificationNote: input.note ?? null,
        })
        .where(eq(employerProfiles.userId, input.userId));
      // Mirror onto the linked company if any.
      const prof = await ctx.db.query.employerProfiles.findFirst({
        where: eq(employerProfiles.userId, input.userId),
      });
      if (prof?.companyId) {
        await ctx.db.update(companies).set({ isVerified: input.approve }).where(eq(companies.id, prof.companyId));
      }
      await audit(ctx.session.user.id, 'employer.verify.review', 'employer', input.userId, { approve: input.approve });
      return { ok: true };
    }),
});
