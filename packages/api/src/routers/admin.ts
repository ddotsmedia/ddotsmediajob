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
  inArray,
} from '@ddots/db';
import { slugify, APPLICANT_LOCATIONS, JOB_STATUS } from '@ddots/shared';
import { tierAtLeast } from '../lib/verification-rules';
import { canTransition, allowedTransitions, isNoopTransition } from '../lib/job-state-machine';
import { adminJobFilterSchema, buildJobWhere } from '../lib/admin-job-filters';
import { pushToAdmins } from '../lib/realtime';
import { delta, rate, fillSeries, dayKeys } from '../lib/analytics-period';
import { featureFlagsAdminRouter } from './feature-flags';
import { ctaAnalyticsRouter } from './cta-analytics';
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
import { audit, notify, uniqueJobSlug, generateJobSlug, jobExpiry } from '../lib/helpers';
import { enqueueEmail, enqueueSearchSync, enqueueJobEvent } from '../lib/queue';
import { extractAndSaveDraft } from '../lib/import';
import { enforceRateLimit, escapeHtml, sanitizeHtml } from '../lib/security';
import { isSearchConfigured, ensureJobsIndex, bulkUpsert, ping as searchPing, indexCount, jobRowToDoc } from '../lib/meili';
import { isIndexingConfigured, submitUrl } from '../lib/google-indexing';
import { ensureVectorSetup, upsertJobEmbedding } from '../lib/embeddings';
import { blockIp, unblockIp, ipBlockingEnabled } from '../lib/security-log';
import { getWhapiSettings, invalidateWhapiSettings, evaluateCriteria, SKIP_LABEL } from '../lib/whapi-criteria';
import { invalidateCategories } from '../lib/categories';
import { sendAlertEmail } from '../lib/email';
import { isJobMessage } from '../lib/import';

/** Revalidate ISR pages that render the category list. No-op outside Next request scope. */
function revalidateCategoryPages(): void {
  try {
    // dynamic require so non-Next callers (workers) don't choke on next/cache
    const { revalidatePath } = require('next/cache') as typeof import('next/cache');
    revalidatePath('/');
    revalidatePath('/jobs');
  } catch {
    /* not in Next runtime — cache TTL + tRPC invalidate will catch up */
  }
}

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
  applicantLocation: z.enum(APPLICANT_LOCATIONS).default('both'),
  accommodationProvided: z.boolean().default(false),
  isRemote: z.boolean().default(false),
  isUrgent: z.boolean().default(false),
  isFresher: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  freeZone: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  walkIn: z.boolean().default(false),
  walkInDate: z.string().max(20).optional(),
  walkInTimeStart: z.string().max(10).optional(),
  walkInTimeEnd: z.string().max(10).optional(),
  walkInVenue: z.string().max(500).optional(),
  walkInMapsUrl: z.string().max(500).optional(),
  walkInLastDate: z.string().max(20).optional(),
  walkInContactPhone: z.string().max(50).nullable().optional(),
  walkInRequiredDocs: z.string().max(2000).optional(),
  skills: z.array(z.string().max(50)).max(40).default([]),
  benefits: z.array(z.string().max(80)).max(20).default([]),
  contactWhatsapp: z.string().max(200).nullable().optional(),
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
      applicantLocation: input.applicantLocation,
      accommodationProvided: input.accommodationProvided,
      isRemote: input.isRemote,
      isUrgent: input.isUrgent,
      isFresher: input.isFresher,
      isFeatured: input.isFeatured,
      freeZone: input.freeZone,
      isAnonymous: input.isAnonymous,
      walkIn: input.walkIn,
      walkInDate: input.walkIn ? input.walkInDate || null : null,
      walkInTimeStart: input.walkIn ? input.walkInTimeStart || null : null,
      walkInTimeEnd: input.walkIn ? input.walkInTimeEnd || null : null,
      walkInVenue: input.walkIn ? input.walkInVenue || null : null,
      walkInMapsUrl: input.walkIn ? input.walkInMapsUrl || null : null,
      walkInLastDate: input.walkIn ? input.walkInLastDate || null : null,
      walkInContactPhone: input.walkIn ? input.walkInContactPhone || null : null,
      walkInRequiredDocs: input.walkIn ? input.walkInRequiredDocs || null : null,
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
      expiresAt: jobExpiry(input),
    })
    .returning();
  return job;
}

/** How many affected records a bulk action names individually in its audit
 *  entry. Beyond this the entry records the overflow count instead, so one
 *  500-job action can't bloat the log. */
const BULK_AUDIT_SAMPLE = 100;

/** Ceiling on "select all matching". Keeps one bulk action bounded and the
 *  id payload small; the UI tells the admin when a filter exceeds it. */
const SELECT_ALL_CAP = 5000;

export const adminRouter = router({
  featureFlags: featureFlagsAdminRouter,
  ctaAnalytics: ctaAnalyticsRouter,
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
    if (job.status === 'active') return { ok: true, changed: false }; // already approved
    if (!canTransition(job.status, 'active', 'admin')) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot approve a ${job.status} job.` });
    }
    const before = { status: job.status, publishedAt: job.publishedAt, rejectionReason: job.rejectionReason };
    const [after] = await ctx.db
      .update(jobs)
      .set({ status: 'active', publishedAt: new Date(), rejectionReason: null })
      .where(eq(jobs.id, input.id))
      .returning({ status: jobs.status, publishedAt: jobs.publishedAt, rejectionReason: jobs.rejectionReason });
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
    await audit(ctx, 'job.approve', 'job', input.id, { title: job.title }, { before, after });
    await enqueueJobEvent({ jobId: input.id, event: 'approved' }).catch(() => {});
    return { ok: true, changed: true };
  }),

  rejectJob: adminProcedure
    .input(z.object({ id: z.string().uuid(), reason: z.string().max(500) }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select({ title: jobs.title, status: jobs.status, rejectionReason: jobs.rejectionReason })
        .from(jobs)
        .where(eq(jobs.id, input.id));
      if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found.' });
      if (before.status === 'rejected') return { ok: true, changed: false };
      if (!canTransition(before.status, 'rejected', 'admin')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot reject a ${before.status} job.` });
      }
      const [after] = await ctx.db
        .update(jobs)
        .set({ status: 'rejected', rejectionReason: input.reason })
        .where(eq(jobs.id, input.id))
        .returning({ title: jobs.title, status: jobs.status, rejectionReason: jobs.rejectionReason });
      await enqueueSearchSync({ type: 'delete', jobId: input.id });
      await audit(ctx, 'job.reject', 'job', input.id, { reason: input.reason, title: before.title }, { before, after });
      return { ok: true, changed: true };
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
      const [before] = await ctx.db
        .select({ email: users.email, isBanned: users.isBanned })
        .from(users)
        .where(eq(users.id, input.userId));
      const [after] = await ctx.db
        .update(users)
        .set({ isBanned: input.banned })
        .where(eq(users.id, input.userId))
        .returning({ email: users.email, isBanned: users.isBanned });
      await audit(ctx, 'user.ban', 'user', input.userId, { email: before?.email }, { before, after });
      return { ok: true };
    }),

  setUserRole: adminProcedure
    .input(z.object({ userId: z.string().uuid(), role: z.enum(['jobseeker', 'employer', 'admin']) }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select({ email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, input.userId));
      const [after] = await ctx.db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId))
        .returning({ email: users.email, role: users.role });
      // Privilege escalation is the single most security-relevant admin action.
      await audit(ctx, 'user.role', 'user', input.userId, { email: before?.email }, { before, after });
      return { ok: true };
    }),

  /** Permanently delete a user (cascades to their jobs/applications/profiles). Blocks self + admins. */
  deleteUser: adminProcedure.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.session.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot delete your own account.' });
    const target = await ctx.db.query.users.findFirst({
      where: eq(users.id, input.userId),
      columns: { id: true, role: true, email: true, name: true, isBanned: true, createdAt: true },
    });
    if (!target) throw new TRPCError({ code: 'NOT_FOUND' });
    if (target.role === 'admin') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Demote the admin before deleting.' });
    // Remove their jobs from Typesense before the DB cascade drops them.
    const theirJobs = await ctx.db.select({ id: jobs.id }).from(jobs).where(eq(jobs.employerId, input.userId));
    await ctx.db.delete(users).where(eq(users.id, input.userId));
    for (const j of theirJobs) await enqueueSearchSync({ type: 'delete', jobId: j.id }).catch(() => {});
    // Cascades through their jobs/applications/profiles — record what was lost.
    await audit(ctx, 'admin.user.delete', 'user', input.userId, { cascadedJobs: theirJobs.length }, { before: target });
    return { ok: true };
  }),

  /** Audit log viewer feed. Optional filters (action substring, entity) + actor
   *  email via a left join. Input is optional so existing no-arg callers still work. */
  auditLog: adminProcedure
    .input(
      z
        .object({
          action: z.string().max(80).optional(), // substring match (actions are namespaced, e.g. admin.job.delete)
          entity: z.string().max(60).optional(),
          actor: z.string().max(200).optional(), // actor email substring
          entityId: z.string().max(80).optional(), // trace everything done to one record
          since: z.date().optional(),
          limit: z.number().min(1).max(500).default(100),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conds = [];
      if (input?.action) conds.push(ilike(auditLogs.action, `%${input.action}%`));
      if (input?.entity) conds.push(eq(auditLogs.entity, input.entity));
      if (input?.entityId) conds.push(eq(auditLogs.entityId, input.entityId));
      if (input?.actor) conds.push(ilike(users.email, `%${input.actor}%`));
      if (input?.since) conds.push(gte(auditLogs.createdAt, input.since));
      return ctx.db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity: auditLogs.entity,
          entityId: auditLogs.entityId,
          meta: auditLogs.meta,
          ip: auditLogs.ip,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          actorEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorId, users.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input?.limit ?? 100);
    }),

  /** Distinct action names actually present in the log — drives the viewer's
   *  filter dropdown so it can't drift from what the mutations emit. */
  auditActions: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .selectDistinct({ action: auditLogs.action, entity: auditLogs.entity })
      .from(auditLogs)
      .orderBy(auditLogs.action)
      .limit(500);
    return {
      actions: [...new Set(rows.map((r) => r.action))],
      entities: [...new Set(rows.map((r) => r.entity).filter((e): e is string => !!e))],
    };
  }),

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
      await audit(ctx, 'employer.verify.review', 'employer', input.userId, { approve: input.approve });
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

  /** Infinite/virtualized variant of allJobs — offset-cursor pagination so the
   *  admin table can scroll through 10k+ rows, loading ~100 at a time, without
   *  ever shipping the whole set to the browser. Additive; allJobs stays as-is. */
  allJobsInfinite: adminProcedure
    .input(
      adminJobFilterSchema.extend({
        limit: z.number().min(1).max(200).default(100),
        cursor: z.number().min(0).default(0), // row offset
      }),
    )
    .query(async ({ ctx, input }) => {
      // Fetch one extra to know whether a next page exists.
      const rows = await ctx.db.query.jobs.findMany({
        where: buildJobWhere(input),
        orderBy: [desc(jobs.createdAt)],
        limit: input.limit + 1,
        offset: input.cursor,
        with: { company: { columns: { name: true } } },
      });
      let nextCursor: number | undefined;
      if (rows.length > input.limit) {
        rows.pop();
        nextCursor = input.cursor + input.limit;
      }
      return { items: rows, nextCursor };
    }),

  /** Total matching the current filters — drives the "select all N" affordance
   *  and the result count, without paging through the whole feed. */
  jobCount: adminProcedure.input(adminJobFilterSchema).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select({ n: count() }).from(jobs).where(buildJobWhere(input));
    return { total: row?.n ?? 0 };
  }),

  /**
   * Counts per status and per emirate for the current filters.
   *
   * Each facet omits its own condition, so the status counts show what you'd get
   * by switching status while keeping every other filter — the point of a facet.
   */
  jobFacets: adminProcedure.input(adminJobFilterSchema).query(async ({ ctx, input }) => {
    const [byStatus, byEmirate] = await Promise.all([
      ctx.db
        .select({ value: jobs.status, n: count() })
        .from(jobs)
        .where(buildJobWhere(input, 'status'))
        .groupBy(jobs.status),
      ctx.db
        .select({ value: jobs.emirateSlug, n: count() })
        .from(jobs)
        .where(buildJobWhere(input, 'emirate'))
        .groupBy(jobs.emirateSlug),
    ]);
    const toMap = (rows: { value: string | null; n: number }[]) =>
      Object.fromEntries(rows.filter((r) => r.value).map((r) => [r.value as string, r.n]));
    return { status: toMap(byStatus), emirate: toMap(byEmirate) };
  }),

  setJobFeatured: adminProcedure
    .input(z.object({ id: z.string().uuid(), featured: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(jobs).set({ isFeatured: input.featured }).where(eq(jobs.id, input.id));
      await enqueueSearchSync({ type: 'upsert', jobId: input.id });
      return { ok: true };
    }),

  setJobStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(JOB_STATUS),
        /** Recorded on the job when rejecting, and in the audit entry either way. */
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select({ title: jobs.title, status: jobs.status, publishedAt: jobs.publishedAt })
        .from(jobs)
        .where(eq(jobs.id, input.id));
      if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found.' });

      // Re-selecting the current status is a no-op, not an error.
      if (isNoopTransition(before.status, input.status)) return { ok: true, changed: false };

      if (!canTransition(before.status, input.status, 'admin')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot move a ${before.status} job to ${input.status}. Allowed: ${
            allowedTransitions(before.status, 'admin').join(', ') || 'none — this status is terminal'
          }.`,
        });
      }

      const [after] = await ctx.db
        .update(jobs)
        .set({
          status: input.status,
          publishedAt: input.status === 'active' ? new Date() : undefined,
          ...(input.status === 'rejected' ? { rejectionReason: input.reason ?? null } : {}),
        })
        .where(eq(jobs.id, input.id))
        .returning({ title: jobs.title, status: jobs.status, publishedAt: jobs.publishedAt });
      await enqueueSearchSync({ type: input.status === 'active' ? 'upsert' : 'delete', jobId: input.id });
      await audit(ctx, 'admin.job.status', 'job', input.id, { title: before.title, reason: input.reason }, { before, after });
      // Another admin's open jobs list is now stale — nudge it to refetch.
      void pushToAdmins('job-changed', { id: input.id, status: input.status });
      if (input.status === 'active') await enqueueJobEvent({ jobId: input.id, event: 'approved' }).catch(() => {});
      return { ok: true, changed: true };
    }),

  /** Which statuses an admin may move this job to — drives the table dropdown so
   *  invalid targets are never offered in the first place. */
  jobTransitions: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [job] = await ctx.db.select({ status: jobs.status }).from(jobs).where(eq(jobs.id, input.id));
      if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
      return { current: job.status, allowed: allowedTransitions(job.status, 'admin') };
    }),

  deleteJob: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    // Snapshot before the row is gone — a delete is irreversible, so this is the
    // only record of what was removed.
    const [before] = await ctx.db
      .select({
        title: jobs.title,
        slug: jobs.slug,
        status: jobs.status,
        employerId: jobs.employerId,
        companyId: jobs.companyId,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(eq(jobs.id, input.id));
    await ctx.db.delete(jobs).where(eq(jobs.id, input.id));
    await enqueueSearchSync({ type: 'delete', jobId: input.id });
    await audit(ctx, 'admin.job.delete', 'job', input.id, undefined, { before });
    return { ok: true };
  }),

  /** Every job id matching the current filter — the ids only, so "select all
   *  1,240 pending" costs one small round-trip instead of scrolling the
   *  infinite feed to load them. Mirrors allJobsInfinite's filters exactly. */
  jobIdsMatching: adminProcedure
    .input(adminJobFilterSchema)
    .query(async ({ ctx, input }) => {
      // Same WHERE as the feed — see admin-job-filters: if these two drift,
      // "select all matching" silently selects a different set than is shown.
      const rows = await ctx.db
        .select({ id: jobs.id })
        .from(jobs)
        .where(buildJobWhere(input))
        .orderBy(desc(jobs.createdAt))
        .limit(SELECT_ALL_CAP + 1);
      // Signals to the UI that the filter is wider than one bulk operation should span.
      const capped = rows.length > SELECT_ALL_CAP;
      return { ids: rows.slice(0, SELECT_ALL_CAP).map((r) => r.id), capped };
    }),

  /** Bulk status change — ONE UPDATE for all ids (vs N per-id calls), then per-job
   *  search sync + approval events, and a single audit entry. Serves "approve 100+
   *  in one click". Mirrors setJobStatus's side effects. */
  bulkSetJobStatus: adminProcedure
    .input(z.object({
      ids: z.array(z.string().uuid()).min(1).max(500),
      status: z.enum(JOB_STATUS),
    }))
    .mutation(async ({ ctx, input }) => {
      // Partition by whether the move is legal from each job's *current* status.
      // Rejecting the whole batch because one job is archived would make bulk
      // moderation unusable, so invalid ones are skipped and reported instead.
      const current = await ctx.db
        .select({ id: jobs.id, status: jobs.status })
        .from(jobs)
        .where(inArray(jobs.id, input.ids));

      const eligible: string[] = [];
      const skipped: { id: string; from: string }[] = [];
      let unchanged = 0;
      for (const j of current) {
        if (isNoopTransition(j.status, input.status)) { unchanged++; continue; }
        if (canTransition(j.status, input.status, 'admin')) eligible.push(j.id);
        else skipped.push({ id: j.id, from: j.status });
      }

      if (eligible.length > 0) {
        await ctx.db
          .update(jobs)
          .set({ status: input.status, publishedAt: input.status === 'active' ? new Date() : undefined })
          .where(inArray(jobs.id, eligible));
        // Search index + approval events are per-job side effects (cheap queue pushes, run in parallel).
        await Promise.all(
          eligible.map(async (id) => {
            await enqueueSearchSync({ type: input.status === 'active' ? 'upsert' : 'delete', jobId: id }).catch(() => {});
            if (input.status === 'active') await enqueueJobEvent({ jobId: id, event: 'approved' }).catch(() => {});
          }),
        );
      }

      await audit(ctx, 'admin.job.bulkStatus', 'job', undefined, {
        status: input.status,
        count: eligible.length,
        unchanged,
        skipped: skipped.length,
        skippedSample: skipped.slice(0, BULK_AUDIT_SAMPLE),
        ids: eligible.slice(0, BULK_AUDIT_SAMPLE),
        ...(eligible.length > BULK_AUDIT_SAMPLE ? { truncated: eligible.length - BULK_AUDIT_SAMPLE } : {}),
      });
      if (eligible.length > 0) void pushToAdmins('job-changed', { count: eligible.length, status: input.status });
      return { count: eligible.length, skipped: skipped.length, unchanged };
    }),

  /** Bulk delete — ONE DELETE for all ids, per-job search removal, single audit entry. */
  bulkDeleteJobs: adminProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      // Record which jobs were destroyed, not just how many — this is the most
      // destructive admin action and the rows are unrecoverable afterwards.
      const doomed = await ctx.db
        .select({ id: jobs.id, title: jobs.title, slug: jobs.slug, status: jobs.status })
        .from(jobs)
        .where(inArray(jobs.id, input.ids));
      await ctx.db.delete(jobs).where(inArray(jobs.id, input.ids));
      await Promise.all(input.ids.map((id) => enqueueSearchSync({ type: 'delete', jobId: id }).catch(() => {})));
      await audit(ctx, 'admin.job.bulkDelete', 'job', undefined, {
        count: doomed.length,
        requested: input.ids.length,
        jobs: doomed.slice(0, BULK_AUDIT_SAMPLE),
        ...(doomed.length > BULK_AUDIT_SAMPLE ? { truncated: doomed.length - BULK_AUDIT_SAMPLE } : {}),
      });
      return { count: input.ids.length };
    }),

  /** Email the employers behind a set of jobs (e.g. "your listing expires soon").
   *  Recipients are deduplicated by address, so an employer with 40 selected jobs
   *  receives one message, not 40. Rate limited — this sends real mail. */
  bulkEmailEmployers: adminProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        subject: z.string().min(3).max(150),
        message: z.string().min(10).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`bulkemail:${ctx.session.user.id}`, 10, 3600);

      const rows = await ctx.db
        .select({ email: users.email, name: users.name })
        .from(jobs)
        .innerJoin(users, eq(jobs.employerId, users.id))
        .where(inArray(jobs.id, input.ids));

      // One message per address, however many of their jobs were selected.
      const recipients = [...new Map(rows.filter((r) => r.email).map((r) => [r.email, r])).values()];

      // Admin-authored copy still gets escaped — it lands inside an HTML email.
      const body = escapeHtml(input.message).replace(/\n/g, '<br/>');

      let sent = 0;
      let failed = 0;
      for (const r of recipients) {
        const ok = await sendAlertEmail(r.email, input.subject, body);
        if (ok) sent++;
        else failed++;
      }

      await audit(ctx, 'admin.job.bulkEmail', 'job', undefined, {
        subject: input.subject,
        jobs: input.ids.length,
        recipients: recipients.length,
        sent,
        failed,
      });
      return { sent, failed, recipients: recipients.length };
    }),

  /** Push a job's expiry out by N days (default 30). Reactivates an already-expired job. */
  extendJobExpiry: adminProcedure
    .input(z.object({ id: z.string().uuid(), days: z.number().int().min(1).max(365).default(30) }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.id), columns: { id: true, expiresAt: true, status: true } });
      if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
      // Extend from whichever is later — now or the current expiry — so extending isn't swallowed by a past date.
      const base = job.expiresAt && job.expiresAt > new Date() ? job.expiresAt : new Date();
      const expiresAt = new Date(base.getTime() + input.days * 86_400_000);
      const reactivate = job.status === 'expired';
      await ctx.db.update(jobs).set({ expiresAt, ...(reactivate ? { status: 'active' as const } : {}) }).where(eq(jobs.id, input.id));
      if (reactivate) await enqueueSearchSync({ type: 'upsert', jobId: input.id });
      await audit(ctx, 'admin.job.extendExpiry', 'job', input.id, { days: input.days, reactivated: reactivate });
      return { ok: true, expiresAt, reactivated: reactivate };
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
      applicantLocation: z.enum(APPLICANT_LOCATIONS).optional(),
      accommodationProvided: z.boolean(),
      isFresher: z.boolean(),
      isRemote: z.boolean(),
      isUrgent: z.boolean(),
      isFeatured: z.boolean(),
      freeZone: z.boolean(),
      isAnonymous: z.boolean(),
      showEmployerInfo: z.boolean(),
      walkIn: z.boolean().default(false),
      walkInDate: z.string().max(20).optional(),
      walkInTimeStart: z.string().max(10).optional(),
      walkInTimeEnd: z.string().max(10).optional(),
      walkInVenue: z.string().max(500).optional(),
      walkInMapsUrl: z.string().max(500).optional(),
      walkInLastDate: z.string().max(20).optional(),
      walkInContactPhone: z.string().max(50).nullable().optional(),
      walkInRequiredDocs: z.string().max(2000).optional(),
      skills: z.array(z.string().max(50)).max(40),
      benefits: z.array(z.string().max(80)).max(20),
      contactWhatsapp: z.string().max(200).nullable().optional(),
      applyEmail: z.string().email().optional().or(z.literal('')),
      status: z.enum(['active', 'pending', 'rejected', 'closed', 'expired', 'filled', 'draft']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, applyEmail, walkInDate, walkInTimeStart, walkInTimeEnd, walkInVenue, walkInMapsUrl, walkInLastDate, walkInContactPhone, walkInRequiredDocs, ...rest } = input;
      const [job] = await ctx.db
        .update(jobs)
        .set({
          ...rest,
          jobType: input.jobType as never,
          description: input.description.includes('<') ? sanitizeHtml(input.description) : input.description,
          location: input.location ?? null,
          contactWhatsapp: input.contactWhatsapp ?? null,
          applyEmail: applyEmail || null,
          walkInDate: input.walkIn ? walkInDate || null : null,
          walkInTimeStart: input.walkIn ? walkInTimeStart || null : null,
          walkInTimeEnd: input.walkIn ? walkInTimeEnd || null : null,
          walkInVenue: input.walkIn ? walkInVenue || null : null,
          walkInMapsUrl: input.walkIn ? walkInMapsUrl || null : null,
          walkInLastDate: input.walkIn ? walkInLastDate || null : null,
          walkInContactPhone: input.walkIn ? walkInContactPhone || null : null,
          walkInRequiredDocs: input.walkIn ? walkInRequiredDocs || null : null,
          publishedAt: input.status === 'active' ? new Date() : undefined,
        })
        .where(eq(jobs.id, id))
        .returning();
      await enqueueSearchSync({ type: input.status === 'active' ? 'upsert' : 'delete', jobId: id });
      await audit(ctx, 'admin.job.update', 'job', id, { status: input.status });
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

  // ── Verification tier review (Phase 4C) ──────────────────
  /** Companies awaiting Enhanced/Pro review (tier = pending). */
  verificationQueue: adminProcedure.query(async ({ ctx }) =>
    ctx.db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        legalName: companies.companyLegalName,
        registrationNumber: companies.companyRegistrationNumber,
        website: companies.website,
        tier: companies.verificationTier,
        status: companies.verificationStatus,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .where(eq(companies.verificationTier, 'pending'))
      .orderBy(desc(companies.createdAt))
      .limit(100),
  ),

  /** Promote (never demote) a company's verification tier with a required review note. */
  updateVerificationTier: adminProcedure
    .input(
      z.object({
        companyId: z.string().uuid(),
        newTier: z.enum(['basic', 'enhanced', 'pro']),
        reviewNotes: z.string().trim().min(3).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const co = await ctx.db.query.companies.findFirst({
        where: eq(companies.id, input.companyId),
        columns: { verificationTier: true, verificationStatus: true },
      });
      if (!co) throw new TRPCError({ code: 'NOT_FOUND' });
      // Forward-only: never demote below the current tier (audit Phase 4C).
      if (!tierAtLeast(input.newTier, co.verificationTier)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot move a company to a lower tier.' });
      }
      const now = new Date().toISOString();
      const prev = (co.verificationStatus ?? {}) as Record<string, unknown> & { history?: unknown[] };
      const history = Array.isArray(prev.history) ? prev.history : [];
      const newStatus = {
        ...prev,
        tier: input.newTier,
        verifiedAt: now,
        reviewNotes: input.reviewNotes,
        promotedBy: ctx.session.user.id,
        history: [...history, { from: co.verificationTier, to: input.newTier, at: now, by: ctx.session.user.id, notes: input.reviewNotes }],
      };
      await ctx.db
        .update(companies)
        .set({ verificationTier: input.newTier, verificationStatus: newStatus, isVerified: true })
        .where(eq(companies.id, input.companyId));
      await audit(ctx, 'company.verification', 'company', input.companyId, { from: co.verificationTier, to: input.newTier, notes: input.reviewNotes });
      return { success: true, tier: input.newTier };
    }),

  /** Delete a company. Jobs/profiles keep working (company_id set null); reviews cascade. */
  deleteCompany: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(companies).where(eq(companies.id, input.id));
    await audit(ctx, 'admin.company.delete', 'company', input.id);
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

  /**
   * Trends for the dashboard widget: a dual time series plus period-over-period
   * KPIs. Distinct from `analytics` above, which is a current-state snapshot
   * (group-by counts) with no notion of change over time.
   */
  analyticsTrends: adminProcedure
    .input(z.object({ days: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(90)]).default(30) }))
    .query(async ({ ctx, input }) => {
      const d = input.days;
      // One row per day across the window, zero-filled by generate_series so the
      // chart's x-axis has no holes. Counts come from correlated subqueries
      // rather than joins to keep each metric independent.
      const seriesRes = await ctx.db.execute(sql`
        SELECT to_char(g::date, 'YYYY-MM-DD') AS date,
               (SELECT count(*) FROM jobs j WHERE j.created_at::date = g::date)::int AS jobs,
               (SELECT count(*) FROM applications a WHERE a.created_at::date = g::date)::int AS applications
        FROM generate_series(current_date - (${d - 1} || ' days')::interval, current_date, interval '1 day') g
        ORDER BY g`);

      // Totals for this window and the one immediately before it, for deltas.
      const totalsRes = await ctx.db.execute(sql`
        SELECT
          (SELECT count(*) FROM jobs WHERE created_at >= current_date - (${d - 1} || ' days')::interval)::int AS jobs_cur,
          (SELECT count(*) FROM jobs WHERE created_at >= current_date - (${2 * d - 1} || ' days')::interval
             AND created_at < current_date - (${d - 1} || ' days')::interval)::int AS jobs_prev,
          (SELECT count(*) FROM applications WHERE created_at >= current_date - (${d - 1} || ' days')::interval)::int AS apps_cur,
          (SELECT count(*) FROM applications WHERE created_at >= current_date - (${2 * d - 1} || ' days')::interval
             AND created_at < current_date - (${d - 1} || ' days')::interval)::int AS apps_prev,
          (SELECT count(*) FROM users WHERE created_at >= current_date - (${d - 1} || ' days')::interval)::int AS users_cur,
          (SELECT count(*) FROM users WHERE created_at >= current_date - (${2 * d - 1} || ' days')::interval
             AND created_at < current_date - (${d - 1} || ' days')::interval)::int AS users_prev,
          (SELECT count(*) FROM jobs WHERE status = 'active'
             AND created_at >= current_date - (${d - 1} || ' days')::interval)::int AS approved_cur,
          (SELECT count(*) FROM jobs WHERE status = 'rejected'
             AND created_at >= current_date - (${d - 1} || ' days')::interval)::int AS rejected_cur`);

      // postgres.js returns an array; some drivers wrap rows in { rows }.
      const unwrap = <T,>(r: unknown): T[] =>
        (r as { rows?: T[] }).rows ?? (r as T[]);

      const rawSeries = unwrap<{ date: string; jobs: number; applications: number }>(seriesRes);
      const series = fillSeries(rawSeries, dayKeys(new Date(), d));
      const t = unwrap<Record<string, number>>(totalsRes)[0] ?? {};
      const n = (k: string) => Number(t[k] ?? 0);

      const decided = n('approved_cur') + n('rejected_cur');
      return {
        days: d,
        series,
        kpis: {
          jobs: delta(n('jobs_cur'), n('jobs_prev')),
          applications: delta(n('apps_cur'), n('apps_prev')),
          users: delta(n('users_cur'), n('users_prev')),
        },
        // Share of jobs decided in this window that were approved rather than rejected.
        approvalRate: rate(n('approved_cur'), decided),
        /** Applications per job posted — demand per listing. */
        appsPerJob: n('jobs_cur') > 0 ? Math.round((n('apps_cur') / n('jobs_cur')) * 10) / 10 : null,
      };
    }),

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
      await audit(ctx, 'admin.application.status', 'application', input.id, { status: input.status });
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
      await audit(ctx, 'admin.setting', 'setting', input.key);
      return { ok: true };
    }),

  // ── Add Job (6 ingestion methods → one create) ─────────
  createJob: adminProcedure.input(adminJobInput).mutation(async ({ ctx, input }) => {
    const job = await insertAdminJob(ctx.db, ctx.session.user.id, input);
    if (job!.status === 'active') await enqueueSearchSync({ type: 'upsert', jobId: job!.id });
    await audit(ctx, 'admin.job.create', 'job', job!.id, { source: input.source, status: input.status });
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
      await audit(ctx, 'admin.job.bulk', 'job', undefined, { created, failed: errors.length });
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
    await audit(ctx, 'admin.job.publish', 'job', input.id);
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
      contactWhatsapp: z.string().max(200).nullable().optional(),
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
      await audit(ctx, 'admin.draft.update', 'job', input.id);
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
      await audit(ctx, 'admin.wabot.addNumber', 'whatsapp_admin', row!.id, { phone: input.phone });
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
    await audit(ctx, 'admin.wabot.delNumber', 'whatsapp_admin', input.id);
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
      await audit(ctx, 'admin.wabot.bulkCreate', 'job', undefined, { posted, total: input.jobs.length });
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
    await audit(ctx, 'admin.security.blockIp', 'ip', undefined, { ip: input.ip });
    return { ok: true };
  }),

  unblockIp: adminProcedure.input(z.object({ ip: z.string().min(3).max(64) })).mutation(async ({ ctx, input }) => {
    await unblockIp(input.ip, ctx.session.user.id);
    await audit(ctx, 'admin.security.unblockIp', 'ip', undefined, { ip: input.ip });
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
    await audit(ctx, 'admin.embeddings.build', 'job', undefined, { embedded });
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
    await audit(ctx, 'admin.googleIndex.bulk', 'job', undefined, { submitted });
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
    await audit(ctx, 'admin.search.reindex', 'job', undefined, { indexed: rows.length });
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
      await audit(ctx, 'admin.feedback.update', 'feedback', input.id, { status: input.status });
      return { ok: true };
    }),

  // ─── Job categories (admin-managed) ────────────────────────────────
  getCategories: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.jobCategories.findMany({ orderBy: [asc(jobCategories.sortOrder), asc(jobCategories.name)] });
    // Live job counts per slug (jobs reference a parent categorySlug; subcategories carry none → 0).
    const counts = await ctx.db.select({ slug: jobs.categorySlug, n: count() }).from(jobs).groupBy(jobs.categorySlug);
    const jobsBySlug = new Map(counts.map((c) => [c.slug, Number(c.n)]));
    const subCountByParent = new Map<string, number>();
    for (const r of rows) if (r.parentId) subCountByParent.set(r.parentId, (subCountByParent.get(r.parentId) ?? 0) + 1);
    return rows.map((r) => ({ ...r, jobCount: jobsBySlug.get(r.slug) ?? 0, subCount: subCountByParent.get(r.id) ?? 0 }));
  }),

  createCategory: adminProcedure
    .input(z.object({ name: z.string().min(2).max(120), nameAr: z.string().max(120).optional(), slug: z.string().min(2).max(60).optional(), icon: z.string().max(60).optional(), parentId: z.string().uuid().nullable().optional(), sortOrder: z.number().int().default(0), isActive: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.slug || input.name);
      await ctx.db.insert(jobCategories).values({ slug, name: input.name, nameAr: input.nameAr || null, icon: input.icon || null, parentId: input.parentId ?? null, sortOrder: input.sortOrder, isActive: input.isActive }).onConflictDoNothing();
      await invalidateCategories();
      revalidateCategoryPages();
      await audit(ctx, 'admin.category.create', 'job_categories', undefined, { slug });
      return { ok: true, slug };
    }),

  updateCategory: adminProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(2).max(120), nameAr: z.string().max(120).nullable().optional(), icon: z.string().max(60).nullable().optional(), parentId: z.string().uuid().nullable().optional(), sortOrder: z.number().int(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(jobCategories).set({ name: input.name, nameAr: input.nameAr ?? null, icon: input.icon ?? null, parentId: input.parentId ?? null, sortOrder: input.sortOrder, isActive: input.isActive }).where(eq(jobCategories.id, input.id));
      await invalidateCategories();
      revalidateCategoryPages();
      await audit(ctx, 'admin.category.update', 'job_categories', input.id);
      return { ok: true };
    }),

  deleteCategory: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const cat = await ctx.db.query.jobCategories.findFirst({ where: eq(jobCategories.id, input.id) });
    if (!cat) throw new TRPCError({ code: 'NOT_FOUND' });
    const [used] = await ctx.db.select({ n: count() }).from(jobs).where(eq(jobs.categorySlug, cat.slug));
    if ((used?.n ?? 0) > 0) throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot delete — ${used!.n} job(s) use this category.` });
    await ctx.db.delete(jobCategories).where(eq(jobCategories.id, input.id));
    await invalidateCategories();
    revalidateCategoryPages();
    await audit(ctx, 'admin.category.delete', 'job_categories', input.id, { slug: cat.slug });
    return { ok: true };
  }),

  /** Insert many subcategories under one parent in a single call (idempotent per slug). */
  bulkAddSubcategories: adminProcedure
    .input(z.object({ parentId: z.string().uuid(), names: z.array(z.string().trim().min(1).max(120)).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const parent = await ctx.db.query.jobCategories.findFirst({ where: eq(jobCategories.id, input.parentId) });
      if (!parent) throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent category not found.' });
      if (parent.parentId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot nest subcategories under a subcategory.' });
      const names = [...new Set(input.names.map((n) => n.trim()).filter(Boolean))];
      if (!names.length) return { ok: true, added: 0 };
      const [existing] = await ctx.db.select({ n: count() }).from(jobCategories).where(eq(jobCategories.parentId, parent.id));
      const base = (existing?.n ?? 0) + 1;
      const values = names.map((name, i) => ({ slug: slugify(`${parent.slug}-${name}`), name, icon: parent.icon, parentId: parent.id, sortOrder: base + i, isActive: true }));
      await ctx.db.insert(jobCategories).values(values).onConflictDoNothing();
      await invalidateCategories();
      revalidateCategoryPages();
      await audit(ctx, 'admin.category.bulkAddSubs', 'job_categories', parent.id, { count: names.length });
      return { ok: true, added: names.length };
    }),

  // ─── Whapi import settings ─────────────────────────────────────────
  /** Send a test email (to the requesting admin) to verify Resend is configured. */
  testEmail: adminProcedure.mutation(async ({ ctx }) => {
    const to = ctx.session.user.email;
    if (!to) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Your admin account has no email address.' });
    const sent = await sendAlertEmail(to, 'DdotsMediaJobs — Email Test', 'If you receive this, Resend is configured correctly.');
    if (!sent) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Email not sent — RESEND_API_KEY is missing or the send failed.' });
    await audit(ctx, 'admin.email.test', 'system', undefined, { to });
    return { ok: true, to };
  }),

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
      await audit(ctx, 'admin.whapi.settings', 'site_settings', undefined, input);
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
      await audit(ctx, 'admin.2fa.enable', 'user', u.id);
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
      await audit(ctx, 'admin.2fa.disable', 'user', u.id);
      return { ok: true };
    }),
});
