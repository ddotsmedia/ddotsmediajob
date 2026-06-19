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
  whatsappAdmins,
  whatsappBotLogs,
  securityLogs,
  whapiSettings,
  jobCategories,
  feedback,
  eq,
  and,
  desc,
  asc,
  gte,
  count,
  sql,
  ilike,
} from '@ddots/db';
import { slugify } from '@ddots/shared';
import {
  generateTotpSecret,
  encryptSecret,
  decryptSecret,
  verifyTotp,
  generateBackupCodes,
  consumeBackupCode,
} from '@ddots/auth';
import { toDataURL } from 'qrcode';
import { createJobFromWhatsApp, type ParsedJob } from '../lib/whatsapp';
import { router, adminProcedure } from '../trpc';
import { audit, notify, uniqueJobSlug, generateJobSlug } from '../lib/helpers';
import { enqueueEmail, enqueueSearchSync, enqueueJobEvent } from '../lib/queue';
import { extractAndSaveDraft } from '../lib/import';
import { enforceRateLimit } from '../lib/security';
import { sanitizeHtml } from '../lib/security';
import { isSearchConfigured, ensureJobsIndex, bulkUpsert, ping as searchPing, indexCount, jobRowToDoc } from '../lib/meili';
import { isIndexingConfigured, submitUrl } from '../lib/google-indexing';
import { ensureVectorSetup, upsertJobEmbedding } from '../lib/embeddings';
import { blockIp, unblockIp, ipBlockingEnabled } from '../lib/security-log';
import { getWhapiSettings, invalidateWhapiSettings, evaluateCriteria, SKIP_LABEL } from '../lib/whapi-criteria';
import { invalidateCategories } from '../lib/categories';
import { isJobMessage } from '../lib/import';

/** Shared shape for admin-created jobs (from any of the 6 ingestion methods). */
const adminJobInput = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10),
  companyName: z.string().max(160).optional(),
  categorySlug: z.string().max(40).default('admin'),
  emirateSlug: z.string().max(40).default('dubai'),
  location: z.string().max(160).optional(),
  jobType: z.string().max(20).default('full-time'),
  experienceLevel: z.string().max(20).optional(),
  salaryMin: z.number().int().nonnegative().nullable().optional(),
  salaryMax: z.number().int().nonnegative().nullable().optional(),
  salaryHidden: z.boolean().default(false),
  salaryNegotiable: z.boolean().default(false),
  visaProvided: z.boolean().default(false),
  accommodationProvided: z.boolean().default(false),
  isRemote: z.boolean().default(false),
  isUrgent: z.boolean().default(false),
  isFresher: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  freeZone: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  skills: z.array(z.string().max(50)).max(40).default([]),
  benefits: z.array(z.string().max(80)).max(20).default([]),
  contactWhatsapp: z.string().max(30).optional(),
  applyEmail: z.string().email().optional(),
  titleAr: z.string().max(160).optional(),
  descriptionAr: z.string().max(10000).optional(),
  requirementsAr: z.string().max(2000).optional(),
  benefitsAr: z.array(z.string().max(120)).max(20).optional(),
  status: z.enum(['active', 'draft']).default('active'),
  source: z.enum(['paste', 'whatsapp', 'csv', 'quick', 'url', 'manual', 'poster']).default('manual'),
});
type AdminJobInput = z.infer<typeof adminJobInput>;

async function findOrCreateCompanyId(db: typeof import('@ddots/db').db, name?: string): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const slug = slugify(name);
  const existing = await db.query.companies.findFirst({ where: eq(companies.slug, slug) });
  if (existing) return existing.id;
  const [co] = await db.insert(companies).values({ slug, name: name.trim(), industry: 'General' }).returning();
  return co?.id ?? null;
}

async function insertAdminJob(db: typeof import('@ddots/db').db, actorId: string, input: AdminJobInput) {
  const companyId = await findOrCreateCompanyId(db, input.companyName);
  const slug = await generateJobSlug(input.title, input.emirateSlug, input.companyName);
  const active = input.status === 'active';
  const [job] = await db
    .insert(jobs)
    .values({
      slug,
      employerId: actorId,
      companyId,
      title: input.title,
      description: input.description.includes('<') ? sanitizeHtml(input.description) : input.description,
      categorySlug: input.categorySlug,
      emirateSlug: input.emirateSlug,
      location: input.location ?? null,
      jobType: input.jobType as never,
      experienceLevel: (input.experienceLevel || null) as never,
      salaryMin: input.salaryNegotiable ? null : input.salaryMin ?? null,
      salaryMax: input.salaryNegotiable ? null : input.salaryMax ?? null,
      salaryHidden: input.salaryHidden,
      salaryNegotiable: input.salaryNegotiable,
      visaProvided: input.visaProvided,
      accommodationProvided: input.accommodationProvided,
      isRemote: input.isRemote,
      isUrgent: input.isUrgent,
      isFresher: input.isFresher,
      isFeatured: input.isFeatured,
      freeZone: input.freeZone,
      isAnonymous: input.isAnonymous,
      skills: input.skills,
      benefits: input.benefits,
      contactWhatsapp: input.contactWhatsapp ?? null,
      applyEmail: input.applyEmail ?? null,
      titleAr: input.titleAr ?? '',
      descriptionAr: input.descriptionAr ?? '',
      requirementsAr: input.requirementsAr ?? '',
      benefitsAr: input.benefitsAr ?? [],
      status: active ? 'active' : 'draft',
      source: input.source,
      aiGenerated: input.source !== 'manual',
      publishedAt: active ? new Date() : null,
    })
    .returning();
  return job;
}

export const adminRouter = router({
  /** Dashboard stats. */
  stats: adminProcedure.query(async ({ ctx }) => {
    const [j, u, a, c, pending, draft, expired, active] = await Promise.all([
      ctx.db.select({ v: count() }).from(jobs),
      ctx.db.select({ v: count() }).from(users),
      ctx.db.select({ v: count() }).from(applications),
      ctx.db.select({ v: count() }).from(companies),
      ctx.db.select({ v: count() }).from(jobs).where(eq(jobs.status, 'pending')),
      ctx.db.select({ v: count() }).from(jobs).where(eq(jobs.status, 'draft')),
      ctx.db.select({ v: count() }).from(jobs).where(eq(jobs.status, 'expired')),
      ctx.db.select({ v: count() }).from(jobs).where(eq(jobs.status, 'active')),
    ]);
    return {
      jobs: j[0]?.v ?? 0,
      users: u[0]?.v ?? 0,
      applications: a[0]?.v ?? 0,
      companies: c[0]?.v ?? 0,
      pendingJobs: pending[0]?.v ?? 0,
      draftJobs: draft[0]?.v ?? 0,
      expiredJobs: expired[0]?.v ?? 0,
      activeJobs: active[0]?.v ?? 0,
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
    void submitUrl(`${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.slug}`, 'URL_UPDATED'); // Google Indexing (best-effort)
    void upsertJobEmbedding(job.id, `${job.title} ${job.categorySlug} ${job.emirateSlug} ${job.description.slice(0, 1000)}`); // semantic (best-effort, no-op if pgvector absent)
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
    await enqueueJobEvent({ jobId: input.id, event: 'approved' }).catch(() => {});
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

  /** Permanently delete a user (cascades to their jobs/applications/profiles). Blocks self + admins. */
  deleteUser: adminProcedure.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.session.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot delete your own account.' });
    const target = await ctx.db.query.users.findFirst({ where: eq(users.id, input.userId), columns: { id: true, role: true } });
    if (!target) throw new TRPCError({ code: 'NOT_FOUND' });
    if (target.role === 'admin') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Demote the admin before deleting.' });
    // Remove their jobs from Typesense before the DB cascade drops them.
    const theirJobs = await ctx.db.select({ id: jobs.id }).from(jobs).where(eq(jobs.employerId, input.userId));
    await ctx.db.delete(users).where(eq(users.id, input.userId));
    for (const j of theirJobs) await enqueueSearchSync({ type: 'delete', jobId: j.id }).catch(() => {});
    await audit(ctx.session.user.id, 'admin.user.delete', 'user', input.userId);
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
      if (input.status === 'active') await enqueueJobEvent({ jobId: input.id, event: 'approved' }).catch(() => {});
      return { ok: true };
    }),

  deleteJob: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(jobs).where(eq(jobs.id, input.id));
    await enqueueSearchSync({ type: 'delete', jobId: input.id });
    await audit(ctx.session.user.id, 'admin.job.delete', 'job', input.id);
    return { ok: true };
  }),

  /** Load any job for admin editing. */
  jobForEdit: adminProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.id) });
    if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
    return job;
  }),

  /** Admin: full edit of any job. Edits go live immediately (bypass approval). */
  updateJob: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(3).max(160),
      description: z.string().min(10),
      categorySlug: z.string().max(40),
      emirateSlug: z.string().max(40),
      location: z.string().max(160).optional(),
      jobType: z.string().max(20),
      salaryMin: z.number().int().nonnegative().nullable().optional(),
      salaryMax: z.number().int().nonnegative().nullable().optional(),
      salaryHidden: z.boolean(),
      visaProvided: z.boolean(),
      accommodationProvided: z.boolean(),
      isFresher: z.boolean(),
      isRemote: z.boolean(),
      isUrgent: z.boolean(),
      isFeatured: z.boolean(),
      freeZone: z.boolean(),
      isAnonymous: z.boolean(),
      showEmployerInfo: z.boolean(),
      skills: z.array(z.string().max(50)).max(40),
      benefits: z.array(z.string().max(80)).max(20),
      contactWhatsapp: z.string().max(30).optional(),
      applyEmail: z.string().email().optional().or(z.literal('')),
      status: z.enum(['active', 'pending', 'rejected', 'closed', 'expired', 'filled', 'draft']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, applyEmail, ...rest } = input;
      const [job] = await ctx.db
        .update(jobs)
        .set({
          ...rest,
          jobType: input.jobType as never,
          description: input.description.includes('<') ? sanitizeHtml(input.description) : input.description,
          location: input.location ?? null,
          contactWhatsapp: input.contactWhatsapp ?? null,
          applyEmail: applyEmail || null,
          publishedAt: input.status === 'active' ? new Date() : undefined,
        })
        .where(eq(jobs.id, id))
        .returning();
      await enqueueSearchSync({ type: input.status === 'active' ? 'upsert' : 'delete', jobId: id });
      await audit(ctx.session.user.id, 'admin.job.update', 'job', id, { status: input.status });
      return { ok: true, slug: job!.slug };
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

  /** Delete a company. Jobs/profiles keep working (company_id set null); reviews cascade. */
  deleteCompany: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(companies).where(eq(companies.id, input.id));
    await audit(ctx.session.user.id, 'admin.company.delete', 'company', input.id);
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

  // ── Analytics ──────────────────────────────────────────
  analytics: adminProcedure.query(async ({ ctx }) => {
    const [jobsByStatus, jobsByCategory, appsByStatus, usersByRole] = await Promise.all([
      ctx.db.select({ key: jobs.status, n: count() }).from(jobs).groupBy(jobs.status),
      ctx.db.select({ key: jobs.categorySlug, n: count() }).from(jobs).groupBy(jobs.categorySlug),
      ctx.db.select({ key: applications.status, n: count() }).from(applications).groupBy(applications.status),
      ctx.db.select({ key: users.role, n: count() }).from(users).groupBy(users.role),
    ]);
    const map = (rows: { key: string | null; n: number }[]) => rows.map((r) => ({ label: r.key ?? 'unknown', value: Number(r.n) }));
    // Funnel in application lifecycle order.
    const order = ['applied', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired'];
    const appMap = new Map(appsByStatus.map((r) => [r.key, Number(r.n)]));
    const funnel = order.map((s) => ({ label: s, value: appMap.get(s as never) ?? 0 }));
    return { jobsByStatus: map(jobsByStatus), jobsByCategory: map(jobsByCategory), appsByStatus: map(appsByStatus), usersByRole: map(usersByRole), funnel };
  }),

  // ── Applications (all jobs) ────────────────────────────
  allApplications: adminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) =>
      ctx.db.query.applications.findMany({
        where: input?.status ? eq(applications.status, input.status as never) : undefined,
        orderBy: [desc(applications.createdAt)],
        limit: 200,
        with: {
          job: { columns: { title: true, slug: true } },
          seeker: { columns: { name: true, email: true } },
        },
      }),
    ),

  setApplicationStatus: adminProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(['applied', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn']) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(applications).set({ status: input.status }).where(eq(applications.id, input.id));
      await audit(ctx.session.user.id, 'admin.application.status', 'application', input.id, { status: input.status });
      return { ok: true };
    }),

  // ── Import integrations (WhatsApp/Telegram/Email/Bulk) ──
  /** Recent DRAFT jobs, optionally filtered by source. */
  recentDrafts: adminProcedure.input(z.object({ source: z.string().max(50).optional() }).optional()).query(async ({ ctx, input }) => {
    const conds = [eq(jobs.status, 'draft')];
    if (input?.source) conds.push(eq(jobs.source, input.source));
    return ctx.db.query.jobs.findMany({ where: and(...conds), orderBy: [desc(jobs.createdAt)], limit: 10, columns: { id: true, slug: true, title: true, source: true, createdAt: true } });
  }),

  /** Bulk-import: split pasted messages and extract each into a DRAFT. */
  bulkImport: adminProcedure.input(z.object({ text: z.string().min(10).max(40000) })).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(`bulkimport:${ctx.session.user.id}`, 10, 3600);
    const chunks = input.text
      .split(/\n\s*---\s*\n|\n\s*\n\s*\n/)
      .map((c) => c.trim())
      .filter((c) => c.length >= 15)
      .slice(0, 20);
    const results: { title: string | null; ok: boolean; error?: string }[] = [];
    for (const chunk of chunks) {
      try {
        const saved = await extractAndSaveDraft(chunk, 'paste');
        results.push({ title: saved?.title ?? null, ok: Boolean(saved) });
      } catch (err) {
        results.push({ title: null, ok: false, error: err instanceof Error ? err.message : 'failed' });
      }
    }
    return { count: results.filter((r) => r.ok).length, total: chunks.length, results };
  }),

  /** Ping Whapi to show a connection indicator. */
  whapiStatus: adminProcedure.query(async () => {
    const key = process.env.WHAPI_API_KEY;
    if (!key) return { connected: false, configured: false };
    try {
      const res = await fetch('https://gate.whapi.cloud/health', { headers: { Authorization: `Bearer ${key}` } });
      return { connected: res.ok, configured: true };
    } catch {
      return { connected: false, configured: true };
    }
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

  // ── Add Job (6 ingestion methods → one create) ─────────
  createJob: adminProcedure.input(adminJobInput).mutation(async ({ ctx, input }) => {
    const job = await insertAdminJob(ctx.db, ctx.session.user.id, input);
    if (job!.status === 'active') await enqueueSearchSync({ type: 'upsert', jobId: job!.id });
    await audit(ctx.session.user.id, 'admin.job.create', 'job', job!.id, { source: input.source, status: input.status });
    return { id: job!.id, slug: job!.slug, status: job!.status };
  }),

  bulkCreateJobs: adminProcedure
    .input(z.object({ jobs: z.array(adminJobInput).min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      let created = 0;
      const errors: { row: number; error: string }[] = [];
      for (let i = 0; i < input.jobs.length; i++) {
        try {
          const job = await insertAdminJob(ctx.db, ctx.session.user.id, input.jobs[i]!);
          if (job!.status === 'active') await enqueueSearchSync({ type: 'upsert', jobId: job!.id });
          created++;
        } catch (e) {
          errors.push({ row: i + 1, error: e instanceof Error ? e.message : 'failed' });
        }
      }
      await audit(ctx.session.user.id, 'admin.job.bulk', 'job', undefined, { created, failed: errors.length });
      return { created, errors };
    }),

  draftJobs: adminProcedure.input(z.object({ source: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const conds = [eq(jobs.status, 'draft')];
    if (input?.source) conds.push(eq(jobs.source, input.source));
    return ctx.db.query.jobs.findMany({
      where: and(...conds),
      orderBy: [desc(jobs.createdAt)],
      limit: 100,
      with: { company: { columns: { name: true } } },
    });
  }),

  publishDraft: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [job] = await ctx.db
      .update(jobs)
      .set({ status: 'active', publishedAt: new Date() })
      .where(eq(jobs.id, input.id))
      .returning();
    if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'Draft not found.' });
    console.log(`[admin] publishDraft ${input.id} -> status=${job.status} (was draft)`);
    await enqueueSearchSync({ type: 'upsert', jobId: input.id });
    if (isIndexingConfigured()) void submitUrl(`${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.slug}`, 'URL_UPDATED'); // Google Indexing (best-effort)
    await audit(ctx.session.user.id, 'admin.job.publish', 'job', input.id);
    return { ok: true, slug: job.slug };
  }),

  /** Edit a draft's fields without changing its status. */
  updateDraft: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(3).max(160),
      description: z.string().min(10),
      companyName: z.string().max(160).optional(),
      categorySlug: z.string().max(40),
      emirateSlug: z.string().max(40),
      jobType: z.string().max(30),
      experienceLevel: z.string().max(20).optional().nullable(),
      salaryMin: z.number().int().nonnegative().nullable().optional(),
      salaryMax: z.number().int().nonnegative().nullable().optional(),
      contactWhatsapp: z.string().max(30).optional(),
      contactEmail: z.string().max(255).optional(),
      visaProvided: z.boolean().optional(),
      accommodationProvided: z.boolean().optional(),
      isUrgent: z.boolean().optional(),
      isFresher: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let companyId: string | undefined;
      if (input.companyName?.trim()) {
        const slug = slugify(input.companyName);
        const existing = await ctx.db.query.companies.findFirst({ where: eq(companies.slug, slug) });
        companyId = existing?.id ?? (await ctx.db.insert(companies).values({ slug, name: input.companyName.trim(), industry: 'General' }).returning())[0]?.id;
      }
      await ctx.db.update(jobs).set({
        title: input.title,
        description: sanitizeHtml(input.description),
        categorySlug: input.categorySlug,
        emirateSlug: input.emirateSlug,
        jobType: input.jobType as never,
        experienceLevel: (input.experienceLevel || null) as never,
        salaryMin: input.salaryMin ?? null,
        salaryMax: input.salaryMax ?? null,
        salaryHidden: input.salaryMin == null && input.salaryMax == null,
        contactWhatsapp: input.contactWhatsapp ?? null,
        applyEmail: input.contactEmail ?? null,
        visaProvided: input.visaProvided ?? false,
        accommodationProvided: input.accommodationProvided ?? false,
        isUrgent: input.isUrgent ?? false,
        isFresher: input.isFresher ?? false,
        ...(companyId ? { companyId } : {}),
      }).where(and(eq(jobs.id, input.id), eq(jobs.status, 'draft')));
      await audit(ctx.session.user.id, 'admin.draft.update', 'job', input.id);
      return { ok: true };
    }),

  // ── WhatsApp bot management ─────────────────────────────
  waBotNumbers: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.whatsappAdmins.findMany({ orderBy: [desc(whatsappAdmins.createdAt)] }),
  ),

  waBotAddNumber: adminProcedure
    .input(z.object({ phone: z.string().trim().regex(/^\+\d{8,15}$/, 'Use international format e.g. +971501234567'), name: z.string().max(100).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(whatsappAdmins)
        .values({ phone: input.phone, name: input.name })
        .onConflictDoUpdate({ target: whatsappAdmins.phone, set: { isActive: true, name: input.name } })
        .returning();
      await audit(ctx.session.user.id, 'admin.wabot.addNumber', 'whatsapp_admin', row!.id, { phone: input.phone });
      return row;
    }),

  waBotToggleNumber: adminProcedure
    .input(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(whatsappAdmins).set({ isActive: input.isActive }).where(eq(whatsappAdmins.id, input.id));
      return { ok: true };
    }),

  waBotDeleteNumber: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(whatsappAdmins).where(eq(whatsappAdmins.id, input.id));
    await audit(ctx.session.user.id, 'admin.wabot.delNumber', 'whatsapp_admin', input.id);
    return { ok: true };
  }),

  waBotLogs: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.whatsappBotLogs.findMany({ orderBy: [desc(whatsappBotLogs.createdAt)], limit: 50 }),
  ),

  // Bulk create jobs from CSV-parsed rows (admin web). Returns per-row result.
  waBotBulkCreate: adminProcedure
    .input(z.object({ jobs: z.array(z.record(z.string(), z.unknown())).min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const results: { slug?: string; error?: string; title: string }[] = [];
      let posted = 0;
      for (const raw of input.jobs) {
        const title = String(raw.title ?? '').trim();
        try {
          if (title.length < 3) throw new Error('Missing title');
          const draft: ParsedJob = {
            title,
            company: (raw.company as string) || null,
            category: (raw.category as string) || null,
            emirate: (raw.emirate as string) || null,
            salary_min: raw.salary_min != null && raw.salary_min !== '' ? Number(raw.salary_min) : null,
            salary_max: raw.salary_max != null && raw.salary_max !== '' ? Number(raw.salary_max) : null,
            job_type: (raw.job_type as string) || null,
            visa_provided: /^(1|true|yes)$/i.test(String(raw.visa_provided ?? '')),
            accommodation: /^(1|true|yes)$/i.test(String(raw.accommodation ?? '')),
            contact_whatsapp: (raw.contact_whatsapp as string) || null,
            contact_email: (raw.contact_email as string) || null,
            description: (raw.description as string) || null,
            urgent: /^(1|true|yes)$/i.test(String(raw.urgent ?? '')),
          };
          const { slug } = await createJobFromWhatsApp(draft, `admin:${ctx.session.user.id}`, 'admin_web');
          posted++;
          results.push({ slug, title });
        } catch (err) {
          results.push({ error: err instanceof Error ? err.message : 'failed', title: title || '(no title)' });
        }
      }
      await audit(ctx.session.user.id, 'admin.wabot.bulkCreate', 'job', undefined, { posted, total: input.jobs.length });
      return { posted, failed: input.jobs.length - posted, results };
    }),

  // ── Search (Meilisearch) ──────────────────────────────────
  /** Status for the Integrations panel: configured? reachable? how many docs? */
  searchStatus: adminProcedure.query(async () => ({
    configured: isSearchConfigured(),
    ok: await searchPing(),
    count: await indexCount(),
  })),

  // ── Security monitoring (Phase 11) ────────────────────────
  securityOverview: adminProcedure.query(async ({ ctx }) => {
    const since = sql`now() - interval '24 hours'`;
    const [byEvent, recent] = await Promise.all([
      ctx.db.select({ event: securityLogs.event, n: count() }).from(securityLogs).where(gte(securityLogs.createdAt, since)).groupBy(securityLogs.event),
      ctx.db.query.securityLogs.findMany({ orderBy: [desc(securityLogs.createdAt)], limit: 100 }),
    ]);
    return { blockingEnabled: ipBlockingEnabled, byEvent: byEvent.map((r) => ({ label: r.event, value: Number(r.n) })), recent };
  }),

  blockIp: adminProcedure.input(z.object({ ip: z.string().min(3).max(64), hours: z.number().int().min(1).max(720).default(24) })).mutation(async ({ ctx, input }) => {
    await blockIp(input.ip, input.hours * 3600, ctx.session.user.id);
    await audit(ctx.session.user.id, 'admin.security.blockIp', 'ip', undefined, { ip: input.ip });
    return { ok: true };
  }),

  unblockIp: adminProcedure.input(z.object({ ip: z.string().min(3).max(64) })).mutation(async ({ ctx, input }) => {
    await unblockIp(input.ip, ctx.session.user.id);
    await audit(ctx.session.user.id, 'admin.security.unblockIp', 'ip', undefined, { ip: input.ip });
    return { ok: true };
  }),

  // ── Semantic embeddings (pgvector, conditional) ───────────
  buildEmbeddings: adminProcedure.mutation(async ({ ctx }) => {
    const ready = await ensureVectorSetup();
    if (!ready) return { embedded: 0, available: false };
    const rows = await ctx.db.query.jobs.findMany({ where: eq(jobs.status, 'active'), orderBy: [desc(jobs.publishedAt)], limit: 500, columns: { id: true, title: true, categorySlug: true, emirateSlug: true, description: true, skills: true } });
    let embedded = 0;
    for (const r of rows) {
      await upsertJobEmbedding(r.id, `${r.title} ${r.categorySlug} ${r.emirateSlug} ${(r.skills ?? []).join(' ')} ${r.description.slice(0, 1000)}`);
      embedded++;
    }
    await audit(ctx.session.user.id, 'admin.embeddings.build', 'job', undefined, { embedded });
    return { embedded, available: true };
  }),

  // ── Google Indexing ───────────────────────────────────────
  indexingStatus: adminProcedure.query(() => ({ configured: isIndexingConfigured() })),

  /** Submit up to 200 most-recent active jobs to the Google Indexing API. */
  submitToGoogleIndex: adminProcedure.mutation(async ({ ctx }) => {
    if (!isIndexingConfigured()) return { submitted: 0, configured: false };
    const rows = await ctx.db.query.jobs.findMany({ where: eq(jobs.status, 'active'), orderBy: [desc(jobs.publishedAt)], limit: 200, columns: { slug: true } });
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ddotsmediajobs.com';
    let submitted = 0;
    for (const r of rows) if (await submitUrl(`${base}/jobs/${r.slug}`, 'URL_UPDATED')) submitted++;
    await audit(ctx.session.user.id, 'admin.googleIndex.bulk', 'job', undefined, { submitted });
    return { submitted, configured: true };
  }),

  /** Re-index every active job into Meilisearch. No-op (indexed 0) when unconfigured. */
  reindexJobs: adminProcedure.mutation(async ({ ctx }) => {
    if (!isSearchConfigured()) return { indexed: 0, configured: false };
    await ensureJobsIndex();
    const rows = await ctx.db.query.jobs.findMany({
      where: eq(jobs.status, 'active'),
      with: { company: { columns: { name: true } } },
    });
    await bulkUpsert(rows.map((r) => jobRowToDoc(r, r.company?.name)));
    await audit(ctx.session.user.id, 'admin.search.reindex', 'job', undefined, { indexed: rows.length });
    return { indexed: rows.length, configured: true };
  }),

  // ─── Feedback inbox ────────────────────────────────────────────────
  getFeedback: adminProcedure
    .input(z.object({ status: z.enum(['unread', 'read', 'replied', 'archived']).optional(), page: z.number().int().min(1).default(1) }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.status ? eq(feedback.status, input.status) : undefined;
      return ctx.db.query.feedback.findMany({ where, orderBy: [desc(feedback.createdAt)], limit: 100, offset: ((input?.page ?? 1) - 1) * 100 });
    }),

  feedbackUnread: adminProcedure.query(async ({ ctx }) => {
    const [r] = await ctx.db.select({ n: count() }).from(feedback).where(eq(feedback.status, 'unread'));
    return r?.n ?? 0;
  }),

  /** Mark read on open, or set status / save an internal note. */
  updateFeedback: adminProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(['unread', 'read', 'replied', 'archived']).optional(), adminNote: z.string().max(4000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(feedback)
        .set({
          ...(input.status ? { status: input.status } : {}),
          ...(input.adminNote !== undefined ? { adminNote: input.adminNote } : {}),
          ...(input.status === 'replied' ? { repliedAt: new Date() } : {}),
        })
        .where(eq(feedback.id, input.id));
      await audit(ctx.session.user.id, 'admin.feedback.update', 'feedback', input.id, { status: input.status });
      return { ok: true };
    }),

  // ─── Job categories (admin-managed) ────────────────────────────────
  getCategories: adminProcedure.query(({ ctx }) => ctx.db.query.jobCategories.findMany({ orderBy: [asc(jobCategories.sortOrder), asc(jobCategories.name)] })),

  createCategory: adminProcedure
    .input(z.object({ name: z.string().min(2).max(120), nameAr: z.string().max(120).optional(), slug: z.string().min(2).max(60).optional(), icon: z.string().max(60).optional(), parentId: z.string().uuid().nullable().optional(), sortOrder: z.number().int().default(0), isActive: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.slug || input.name);
      await ctx.db.insert(jobCategories).values({ slug, name: input.name, nameAr: input.nameAr || null, icon: input.icon || null, parentId: input.parentId ?? null, sortOrder: input.sortOrder, isActive: input.isActive }).onConflictDoNothing();
      await invalidateCategories();
      await audit(ctx.session.user.id, 'admin.category.create', 'job_categories', undefined, { slug });
      return { ok: true, slug };
    }),

  updateCategory: adminProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(2).max(120), nameAr: z.string().max(120).nullable().optional(), icon: z.string().max(60).nullable().optional(), parentId: z.string().uuid().nullable().optional(), sortOrder: z.number().int(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(jobCategories).set({ name: input.name, nameAr: input.nameAr ?? null, icon: input.icon ?? null, parentId: input.parentId ?? null, sortOrder: input.sortOrder, isActive: input.isActive }).where(eq(jobCategories.id, input.id));
      await invalidateCategories();
      await audit(ctx.session.user.id, 'admin.category.update', 'job_categories', input.id);
      return { ok: true };
    }),

  deleteCategory: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const cat = await ctx.db.query.jobCategories.findFirst({ where: eq(jobCategories.id, input.id) });
    if (!cat) throw new TRPCError({ code: 'NOT_FOUND' });
    const [used] = await ctx.db.select({ n: count() }).from(jobs).where(eq(jobs.categorySlug, cat.slug));
    if ((used?.n ?? 0) > 0) throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot delete — ${used!.n} job(s) use this category.` });
    await ctx.db.delete(jobCategories).where(eq(jobCategories.id, input.id));
    await invalidateCategories();
    await audit(ctx.session.user.id, 'admin.category.delete', 'job_categories', input.id, { slug: cat.slug });
    return { ok: true };
  }),

  // ─── Whapi import settings ─────────────────────────────────────────
  whapiSettings: adminProcedure.query(() => getWhapiSettings()),

  saveWhapiSettings: adminProcedure
    .input(
      z.object({
        minTextLength: z.number().int().min(1).max(1000),
        requireSalary: z.boolean(),
        requireContact: z.boolean(),
        requireLocation: z.boolean(),
        allowedGroups: z.array(z.string().max(200)).max(500),
        blockedNumbers: z.array(z.string().max(40)).max(500),
        blockedKeywords: z.array(z.string().max(80)).max(500),
        customKeywords: z.array(z.string().max(80)).max(500),
        blockOwnMessages: z.boolean(),
        autoPublish: z.boolean(),
        replyOnSuccess: z.boolean(),
        replyOnSkip: z.boolean(),
        successMessage: z.string().max(1000).nullable(),
        skipMessage: z.string().max(1000).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.whapiSettings.findFirst({ columns: { id: true } });
      if (existing) {
        await ctx.db.update(whapiSettings).set(input).where(eq(whapiSettings.id, existing.id));
      } else {
        await ctx.db.insert(whapiSettings).values(input);
      }
      await invalidateWhapiSettings();
      await audit(ctx.session.user.id, 'admin.whapi.settings', 'site_settings', undefined, input);
      return { ok: true };
    }),

  testWhapiCriteria: adminProcedure
    .input(z.object({ text: z.string().max(8000), chatId: z.string().max(200).optional(), from: z.string().max(40).optional() }))
    .mutation(async ({ input }) => {
      const settings = await getWhapiSettings();
      const r = evaluateCriteria(input.text, { from: input.from, chatId: input.chatId, isJobKeyword: isJobMessage }, settings);
      return {
        ok: r.ok,
        reason: r.reason ?? null,
        label: r.reason ? SKIP_LABEL[r.reason] : null,
        detail: r.detail ?? null,
        action: r.ok ? (settings.autoPublish ? 'publish' : 'draft') : 'skip',
      };
    }),

  /** Uptime monitor stats (written by the worker's 5-min health ping). */
  uptimeStatus: adminProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.query.siteSettings.findFirst({ where: eq(siteSettings.key, 'uptime_monitor') });
    const v = (row?.value ?? null) as { checks?: number; ups?: number; lastStatus?: string; lastCheckAt?: string; consecutiveFails?: number } | null;
    if (!v || !v.checks) return { configured: false, percent: null, lastStatus: 'unknown', lastCheckAt: null, checks: 0 };
    return {
      configured: true,
      percent: Math.round(((v.ups ?? 0) / v.checks) * 1000) / 10,
      lastStatus: v.lastStatus ?? 'unknown',
      lastCheckAt: v.lastCheckAt ?? null,
      checks: v.checks,
    };
  }),

  // ─── TOTP 2FA (opt-in for admins) ──────────────────────────────────
  /** Current 2FA state for the signed-in admin. */
  twoFactorStatus: adminProcedure.query(async ({ ctx }) => {
    const u = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
      columns: { totpEnabled: true, totpBackupCodes: true },
    });
    return { enabled: u?.totpEnabled ?? false, backupCodesLeft: (u?.totpBackupCodes ?? []).length };
  }),

  /**
   * Begin setup: generate a secret + QR. Stores the secret encrypted but leaves
   * 2FA disabled until verified. Returns the QR data URL + otpauth URI.
   */
  twoFactorSetup: adminProcedure.mutation(async ({ ctx }) => {
    const u = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.session.user.id) });
    if (!u?.email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No account email' });
    if (u.totpEnabled) throw new TRPCError({ code: 'BAD_REQUEST', message: '2FA already enabled' });
    const { secret, otpauth } = generateTotpSecret(u.email);
    await ctx.db.update(users).set({ totpSecret: await encryptSecret(secret) }).where(eq(users.id, u.id));
    const qrDataUrl = await toDataURL(otpauth, { margin: 1, width: 220 });
    return { otpauth, qrDataUrl };
  }),

  /** Verify the first code and enable 2FA; returns one-time backup codes. */
  twoFactorEnable: adminProcedure
    .input(z.object({ code: z.string().min(6).max(10) }))
    .mutation(async ({ ctx, input }) => {
      const u = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.session.user.id) });
      if (!u?.totpSecret) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Run setup first' });
      const secret = await decryptSecret(u.totpSecret);
      if (!secret || !(await verifyTotp(input.code, secret))) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid code — try again' });
      }
      const { plain, hashed } = await generateBackupCodes();
      await ctx.db.update(users).set({ totpEnabled: true, totpBackupCodes: hashed }).where(eq(users.id, u.id));
      await audit(ctx.session.user.id, 'admin.2fa.enable', 'user', u.id);
      return { backupCodes: plain };
    }),

  /** Disable 2FA (requires a valid current code or backup code). */
  twoFactorDisable: adminProcedure
    .input(z.object({ code: z.string().min(6).max(10) }))
    .mutation(async ({ ctx, input }) => {
      const u = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.session.user.id) });
      if (!u?.totpEnabled || !u.totpSecret) throw new TRPCError({ code: 'BAD_REQUEST', message: '2FA not enabled' });
      const secret = await decryptSecret(u.totpSecret);
      const ok = (secret && (await verifyTotp(input.code, secret))) || (await consumeBackupCode(input.code, u.totpBackupCodes ?? []));
      if (!ok) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid code' });
      await ctx.db.update(users).set({ totpEnabled: false, totpSecret: null, totpBackupCodes: [] }).where(eq(users.id, u.id));
      await audit(ctx.session.user.id, 'admin.2fa.disable', 'user', u.id);
      return { ok: true };
    }),
});
