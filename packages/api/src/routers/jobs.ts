import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  jobs,
  companies,
  savedJobs,
  applications,
  jobseekerProfiles,
  eq,
  and,
  or,
  gte,
  desc,
  asc,
  ilike,
  sql,
  count,
  inArray,
} from '@ddots/db';
import { jobFilterSchema, jobInputSchema, jobFieldsSchema, aiQuickPostSchema, communityPostSchema } from '@ddots/shared';
import { router, publicProcedure, employerProcedure, protectedProcedure } from '../trpc';
import { uniqueJobSlug, audit } from '../lib/helpers';
import { enqueueSearchSync } from '../lib/queue';
import { generateJobFromPrompt } from '../lib/anthropic';

export const jobsRouter = router({
  /** Public paginated, filtered job listing. */
  list: publicProcedure.input(jobFilterSchema).query(async ({ ctx, input }) => {
    // Active and not past expiry (lazy-expire guard — never show stale listings even if cron lags).
    const conds = [eq(jobs.status, 'active'), or(sql`${jobs.expiresAt} IS NULL`, gte(jobs.expiresAt, sql`now()`))!];
    if (input.q) {
      conds.push(or(ilike(jobs.title, `%${input.q}%`), ilike(jobs.description, `%${input.q}%`))!);
    }
    if (input.category) conds.push(eq(jobs.categorySlug, input.category));
    if (input.emirate) conds.push(eq(jobs.emirateSlug, input.emirate));
    if (input.jobType) conds.push(eq(jobs.jobType, input.jobType));
    if (input.visaStatus) conds.push(eq(jobs.visaStatus, input.visaStatus));
    if (input.experienceLevel) conds.push(eq(jobs.experienceLevel, input.experienceLevel));
    if (input.salaryMin) conds.push(gte(jobs.salaryMax, input.salaryMin));
    if (input.isRemote) conds.push(eq(jobs.isRemote, true));
    if (input.isFresher) conds.push(eq(jobs.isFresher, true));
    if (input.isUrgent) conds.push(eq(jobs.isUrgent, true));
    if (input.freeZone) conds.push(eq(jobs.freeZone, true));
    if (input.visaProvided) conds.push(eq(jobs.visaProvided, true));

    const where = and(...conds);
    const orderBy =
      input.sort === 'salary'
        ? [desc(jobs.salaryMax)]
        : input.sort === 'relevance'
          ? [desc(jobs.isFeatured), desc(jobs.publishedAt)]
          : [desc(jobs.publishedAt)];

    const [rows, totalRow] = await Promise.all([
      ctx.db.query.jobs.findMany({
        where,
        orderBy,
        limit: input.perPage,
        offset: (input.page - 1) * input.perPage,
        with: { company: { columns: { name: true, slug: true, logoUrl: true, isVerified: true } } },
      }),
      ctx.db.select({ value: count() }).from(jobs).where(where),
    ]);

    const total = totalRow[0]?.value ?? 0;
    return {
      jobs: rows,
      total,
      page: input.page,
      perPage: input.perPage,
      totalPages: Math.ceil(total / input.perPage),
    };
  }),

  /** Public single job by slug; increments view count. */
  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const job = await ctx.db.query.jobs.findFirst({
      where: eq(jobs.slug, input.slug),
      with: { company: true, employer: { columns: { name: true, image: true } } },
    });
    if (!job || (job.status !== 'active' && ctx.session?.user?.role !== 'admin')) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found.' });
    }
    await ctx.db.update(jobs).set({ viewCount: sql`${jobs.viewCount} + 1` }).where(eq(jobs.id, job.id));
    return job;
  }),

  /** Featured jobs for the homepage. */
  featured: publicProcedure.input(z.object({ limit: z.number().min(1).max(24).default(8) })).query(
    async ({ ctx, input }) =>
      ctx.db.query.jobs.findMany({
        where: and(eq(jobs.status, 'active'), eq(jobs.isFeatured, true)),
        orderBy: [desc(jobs.publishedAt)],
        limit: input.limit,
        with: { company: { columns: { name: true, logoUrl: true } } },
      }),
  ),

  /** Per-category / per-emirate counts for landing pages. */
  stats: publicProcedure.query(async ({ ctx }) => {
    const [byCategory, byEmirate, totals] = await Promise.all([
      ctx.db
        .select({ slug: jobs.categorySlug, value: count() })
        .from(jobs)
        .where(eq(jobs.status, 'active'))
        .groupBy(jobs.categorySlug),
      ctx.db
        .select({ slug: jobs.emirateSlug, value: count() })
        .from(jobs)
        .where(eq(jobs.status, 'active'))
        .groupBy(jobs.emirateSlug),
      ctx.db.select({ value: count() }).from(jobs).where(eq(jobs.status, 'active')),
    ]);
    return {
      byCategory: Object.fromEntries(byCategory.map((r) => [r.slug, r.value])),
      byEmirate: Object.fromEntries(byEmirate.map((r) => [r.slug, r.value])),
      totalActive: totals[0]?.value ?? 0,
    };
  }),

  /** Employer: list own jobs. */
  mine: employerProcedure.query(async ({ ctx }) =>
    ctx.db.query.jobs.findMany({
      where: eq(jobs.employerId, ctx.session.user.id),
      orderBy: [desc(jobs.createdAt)],
    }),
  ),

  /** Employer: create a job (goes to pending unless admin). */
  create: employerProcedure.input(jobInputSchema).mutation(async ({ ctx, input }) => {
    const slug = await uniqueJobSlug(input.title);
    const isAdmin = ctx.session.user.role === 'admin';

    const employerProfile = await ctx.db.query.employerProfiles.findFirst({
      where: (p, { eq: e }) => e(p.userId, ctx.session.user.id),
    });

    const [job] = await ctx.db
      .insert(jobs)
      .values({
        ...input,
        slug,
        employerId: ctx.session.user.id,
        companyId: employerProfile?.companyId ?? null,
        status: isAdmin ? 'active' : 'pending',
        publishedAt: isAdmin ? new Date() : null,
      })
      .returning();

    await audit(ctx.session.user.id, 'job.create', 'job', job!.id);
    if (job!.status === 'active') await enqueueSearchSync({ type: 'upsert', jobId: job!.id });
    return job;
  }),

  /** Employer: AI quick-post via Claude Haiku — returns a draft (not saved). */
  aiQuickPost: employerProcedure.input(aiQuickPostSchema).mutation(async ({ input }) => {
    const draft = await generateJobFromPrompt(input.prompt);
    return draft;
  }),

  /** Employer: update own job. */
  update: employerProcedure
    .input(z.object({ id: z.string().uuid(), data: jobFieldsSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (existing.employerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const [updated] = await ctx.db
        .update(jobs)
        .set(input.data)
        .where(eq(jobs.id, input.id))
        .returning();
      await enqueueSearchSync({ type: updated!.status === 'active' ? 'upsert' : 'delete', jobId: updated!.id });
      await audit(ctx.session.user.id, 'job.update', 'job', input.id);
      return updated;
    }),

  /** Employer: close / delete own job. */
  close: employerProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.id) });
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
    if (existing.employerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    await ctx.db.update(jobs).set({ status: 'closed' }).where(eq(jobs.id, input.id));
    await enqueueSearchSync({ type: 'delete', jobId: input.id });
    await audit(ctx.session.user.id, 'job.close', 'job', input.id);
    return { ok: true };
  }),

  /** Employer: load one of their own jobs for editing. */
  byId: employerProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.id) });
    if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
    if (job.employerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return job;
  }),

  /** Employer: renew an expired/closed job for another 30 days. */
  renew: employerProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.id) });
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
    if (existing.employerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const [updated] = await ctx.db
      .update(jobs)
      .set({ status: 'active', publishedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86_400_000) })
      .where(eq(jobs.id, input.id))
      .returning();
    await enqueueSearchSync({ type: 'upsert', jobId: input.id });
    await audit(ctx.session.user.id, 'job.renew', 'job', input.id);
    return updated;
  }),

  /** Any logged-in user: post a community referral job. Limit 2 per rolling 30 days; expires in 15 days. */
  createCommunity: protectedProcedure.input(communityPostSchema).mutation(async ({ ctx, input }) => {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [{ value: recent } = { value: 0 }] = await ctx.db
      .select({ value: count() })
      .from(jobs)
      .where(and(eq(jobs.employerId, ctx.session.user.id), eq(jobs.source, 'community'), gte(jobs.createdAt, since)));
    if (recent >= 2) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Community post limit reached (2 per 30 days). Try again later.' });
    }

    const slug = await uniqueJobSlug(input.title);
    const [job] = await ctx.db
      .insert(jobs)
      .values({
        slug,
        employerId: ctx.session.user.id,
        companyId: null,
        title: input.title,
        description: input.description,
        categorySlug: input.categorySlug,
        emirateSlug: input.emirateSlug,
        jobType: 'full-time',
        experienceLevel: '1-3-years',
        salaryMin: input.salaryMin ?? null,
        salaryMax: input.salaryMax ?? null,
        salaryHidden: input.salaryMin == null && input.salaryMax == null,
        isAnonymous: input.isAnonymous,
        contactWhatsapp: input.contactWhatsapp ?? null,
        applyEmail: input.contactEmail ?? null,
        relation: input.relation,
        source: 'community',
        status: 'pending', // community posts always reviewed before going live
        expiresAt: new Date(Date.now() + 15 * 86_400_000),
      })
      .returning();

    await audit(ctx.session.user.id, 'job.create.community', 'job', job!.id);
    return job;
  }),

  /** Any logged-in user: list their own community referral posts. */
  myCommunity: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.query.jobs.findMany({
      where: and(eq(jobs.employerId, ctx.session.user.id), eq(jobs.source, 'community')),
      orderBy: [desc(jobs.createdAt)],
    }),
  ),

  /** Jobseeker: recommended jobs based on profile (category/emirate), excluding already-applied. */
  recommended: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(12).default(6) }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.jobseekerProfiles.findFirst({
        where: eq(jobseekerProfiles.userId, ctx.session.user.id),
      });
      const applied = await ctx.db
        .select({ jobId: applications.jobId })
        .from(applications)
        .where(eq(applications.seekerId, ctx.session.user.id));
      const appliedIds = applied.map((a) => a.jobId);

      const conds = [eq(jobs.status, 'active')];
      if (profile?.categorySlug) conds.push(eq(jobs.categorySlug, profile.categorySlug));
      if (appliedIds.length) conds.push(sql`${jobs.id} NOT IN (${sql.join(appliedIds.map((id) => sql`${id}`), sql`, `)})`);

      const rows = await ctx.db.query.jobs.findMany({
        where: and(...conds),
        orderBy: [
          profile?.emirateSlug ? sql`(${jobs.emirateSlug} = ${profile.emirateSlug}) desc` : desc(jobs.isFeatured),
          desc(jobs.publishedAt),
        ],
        limit: input.limit,
        with: { company: { columns: { name: true, logoUrl: true } } },
      });
      return rows;
    }),
});
