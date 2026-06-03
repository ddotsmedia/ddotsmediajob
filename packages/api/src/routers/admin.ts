import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  jobs,
  users,
  applications,
  companies,
  companyReviews,
  whatsappGroups,
  salaryReports,
  communityPosts,
  siteSettings,
  blogPosts,
  employerProfiles,
  auditLogs,
  eq,
  and,
  desc,
  count,
  sql,
  ilike,
} from '@ddots/db';
import { router, adminProcedure } from '../trpc';
import { audit, notify } from '../lib/helpers';
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
    await notify(job.employerId, 'job-approved', `Your job "${job.title}" is live`, {
      link: `/jobs/${job.slug}`,
    });
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

  // ── Rich dashboard overview ────────────────────────────
  overview: adminProcedure.query(async ({ ctx }) => {
    const [jobsByStatus, usersByRole, appsByStatus, topCats, recentJobs, recentUsers, series] = await Promise.all([
      ctx.db.select({ k: jobs.status, v: count() }).from(jobs).groupBy(jobs.status),
      ctx.db.select({ k: users.role, v: count() }).from(users).groupBy(users.role),
      ctx.db.select({ k: applications.status, v: count() }).from(applications).groupBy(applications.status),
      ctx.db
        .select({ k: jobs.categorySlug, v: count() })
        .from(jobs)
        .where(eq(jobs.status, 'active'))
        .groupBy(jobs.categorySlug)
        .orderBy(desc(count()))
        .limit(8),
      ctx.db.query.jobs.findMany({ orderBy: [desc(jobs.createdAt)], limit: 6, columns: { id: true, title: true, status: true, createdAt: true } }),
      ctx.db.query.users.findMany({ orderBy: [desc(users.createdAt)], limit: 6, columns: { id: true, name: true, email: true, role: true, createdAt: true } }),
      ctx.db.execute(sql`
        SELECT to_char(d::date,'Mon DD') AS label, COALESCE(c.cnt,0)::int AS value
        FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') d
        LEFT JOIN (SELECT created_at::date dt, count(*) cnt FROM jobs GROUP BY 1) c ON c.dt = d::date
        ORDER BY d`),
    ]);
    const obj = (rows: { k: string | null; v: number }[]) => Object.fromEntries(rows.map((r) => [r.k ?? 'unknown', r.v]));
    return {
      jobsByStatus: obj(jobsByStatus),
      usersByRole: obj(usersByRole),
      appsByStatus: obj(appsByStatus),
      topCategories: topCats.map((r) => ({ slug: r.k, count: r.v })),
      recentJobs,
      recentUsers,
      jobsSeries: (series as unknown as { rows?: { label: string; value: number }[] }).rows ?? (series as unknown as { label: string; value: number }[]),
    };
  }),

  // ── All jobs management ────────────────────────────────
  allJobs: adminProcedure
    .input(z.object({ q: z.string().optional(), status: z.string().optional(), page: z.number().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      const conds = [];
      if (input.q) conds.push(ilike(jobs.title, `%${input.q}%`));
      if (input.status) conds.push(eq(jobs.status, input.status as never));
      return ctx.db.query.jobs.findMany({
        where: conds.length ? and(...conds) : undefined,
        orderBy: [desc(jobs.createdAt)],
        limit: 25,
        offset: (input.page - 1) * 25,
        with: { company: { columns: { name: true } } },
      });
    }),

  setJobFeatured: adminProcedure
    .input(z.object({ id: z.string().uuid(), featured: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(jobs).set({ isFeatured: input.featured }).where(eq(jobs.id, input.id));
      await enqueueSearchSync({ type: 'upsert', jobId: input.id });
      return { ok: true };
    }),

  setJobStatus: adminProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(['active', 'pending', 'rejected', 'closed', 'expired', 'filled', 'draft']) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(jobs)
        .set({ status: input.status, publishedAt: input.status === 'active' ? new Date() : undefined })
        .where(eq(jobs.id, input.id));
      await enqueueSearchSync({ type: input.status === 'active' ? 'upsert' : 'delete', jobId: input.id });
      await audit(ctx.session.user.id, 'admin.job.status', 'job', input.id, { status: input.status });
      return { ok: true };
    }),

  deleteJob: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(jobs).where(eq(jobs.id, input.id));
    await enqueueSearchSync({ type: 'delete', jobId: input.id });
    await audit(ctx.session.user.id, 'admin.job.delete', 'job', input.id);
    return { ok: true };
  }),

  // ── Companies ──────────────────────────────────────────
  allCompanies: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.companies.findMany({ orderBy: [desc(companies.createdAt)], limit: 100 }),
  ),
  setCompanyVerified: adminProcedure
    .input(z.object({ id: z.string().uuid(), verified: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(companies).set({ isVerified: input.verified }).where(eq(companies.id, input.id));
      return { ok: true };
    }),

  // ── Review moderation ──────────────────────────────────
  pendingReviews: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.companyReviews.findMany({
      where: eq(companyReviews.isApproved, false),
      orderBy: [desc(companyReviews.createdAt)],
      with: { company: { columns: { name: true } } },
    }),
  ),
  moderateReview: adminProcedure
    .input(z.object({ id: z.string().uuid(), approve: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.approve) await ctx.db.update(companyReviews).set({ isApproved: true }).where(eq(companyReviews.id, input.id));
      else await ctx.db.delete(companyReviews).where(eq(companyReviews.id, input.id));
      return { ok: true };
    }),

  // ── WhatsApp groups CRUD ───────────────────────────────
  waGroups: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.whatsappGroups.findMany({ orderBy: [desc(whatsappGroups.createdAt)], limit: 200 }),
  ),
  waUpsert: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(2).max(160),
        inviteUrl: z.string().url(),
        categorySlug: z.string().max(40).optional(),
        emirateSlug: z.string().max(40).optional(),
        description: z.string().max(500).optional(),
        memberCount: z.number().int().min(0).default(0),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        await ctx.db.update(whatsappGroups).set(data).where(eq(whatsappGroups.id, id));
        return { id };
      }
      const [row] = await ctx.db.insert(whatsappGroups).values(data).returning();
      return { id: row!.id };
    }),
  waDelete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(whatsappGroups).where(eq(whatsappGroups.id, input.id));
    return { ok: true };
  }),

  // ── Salary moderation ──────────────────────────────────
  salaryReports: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.salaryReports.findMany({ orderBy: [desc(salaryReports.createdAt)], limit: 100 }),
  ),
  setSalaryVerified: adminProcedure
    .input(z.object({ id: z.string().uuid(), verified: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(salaryReports).set({ isVerified: input.verified }).where(eq(salaryReports.id, input.id));
      return { ok: true };
    }),
  deleteSalary: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(salaryReports).where(eq(salaryReports.id, input.id));
    return { ok: true };
  }),

  // ── Community moderation ───────────────────────────────
  communityThreads: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.communityPosts.findMany({
      where: sql`${communityPosts.parentId} IS NULL`,
      orderBy: [desc(communityPosts.createdAt)],
      limit: 100,
    }),
  ),
  pinThread: adminProcedure
    .input(z.object({ id: z.string().uuid(), pinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(communityPosts).set({ isPinned: input.pinned }).where(eq(communityPosts.id, input.id));
      return { ok: true };
    }),
  deleteThread: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(communityPosts).where(eq(communityPosts.id, input.id));
    return { ok: true };
  }),

  // ── Site settings ──────────────────────────────────────
  getSettings: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.siteSettings.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }),
  setSetting: adminProcedure
    .input(z.object({ key: z.string().max(80), value: z.any() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(siteSettings)
        .values({ key: input.key, value: input.value })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: input.value } });
      await audit(ctx.session.user.id, 'admin.setting', 'setting', input.key);
      return { ok: true };
    }),
});
