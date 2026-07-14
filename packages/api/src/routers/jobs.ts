import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  jobs,
  companies,
  savedJobs,
  applications,
  jobseekerProfiles,
  employerProfiles,
  siteSettings,
  users,
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
  isNull,
} from '@ddots/db';
import { jobFilterSchema, jobInputSchema, jobFieldsSchema, aiQuickPostSchema, communityPostSchema } from '@ddots/shared';
import { router, publicProcedure, employerProcedure, protectedProcedure } from '../trpc';
import { uniqueJobSlug, generateJobSlug, audit, jobExpiry } from '../lib/helpers';
import { enqueueSearchSync, enqueueJobEvent } from '../lib/queue';
import { generateJobFromPrompt } from '../lib/anthropic';
import { isSearchConfigured, searchJobs, suggest as meiliSuggest } from '../lib/meili';
import { similarJobIds } from '../lib/embeddings';
import { cached } from '../lib/security';

export const jobsRouter = router({
  /** Public: fetch up to 3 active jobs by slug for side-by-side comparison. */
  bySlugs: publicProcedure.input(z.object({ slugs: z.array(z.string().max(120)).min(1).max(3) })).query(async ({ ctx, input }) =>
    ctx.db.query.jobs.findMany({
      where: and(inArray(jobs.slug, input.slugs), eq(jobs.status, 'active')),
      with: { company: { columns: { name: true, logoUrl: true } } },
      limit: 3,
    }),
  ),

  /** Autocomplete suggestions for the search bar (Meilisearch; [] when unconfigured). */
  suggest: publicProcedure
    .input(z.object({ q: z.string().max(80) }))
    .query(async ({ input }) => (input.q.trim() ? meiliSuggest(input.q) : [])),

  /** Public paginated, filtered job listing. */
  list: publicProcedure.input(jobFilterSchema).query(async ({ ctx, input }) => {
    const companyCols = { name: true, slug: true, logoUrl: true, isVerified: true } as const;

    // Fast path: full-text search via Meilisearch when configured + a query is present.
    if (input.q && isSearchConfigured()) {
      const filters: string[] = [];
      if (input.category) filters.push(`category = "${input.category}"`);
      if (input.emirate) filters.push(`emirate = "${input.emirate}"`);
      if (input.jobType) filters.push(`jobType = "${input.jobType}"`);
      if (input.salaryMin) filters.push(`salaryMax >= ${input.salaryMin}`);
      if (input.isFresher) filters.push('freshersWelcome = true');
      if (input.isUrgent) filters.push('urgent = true');
      if (input.visaProvided) filters.push('visaProvided = true');
      const sort =
        input.sort === 'salary' ? ['salaryMax:desc'] : input.sort === 'newest' ? ['createdAt:desc'] : undefined;
      const hit = await searchJobs({ q: input.q, filters, sort, limit: input.perPage, offset: (input.page - 1) * input.perPage });
      if (hit) {
        const rows = hit.ids.length
          ? await ctx.db.query.jobs.findMany({ where: inArray(jobs.id, hit.ids), with: { company: { columns: companyCols } } })
          : [];
        const byId = new Map(rows.map((r) => [r.id, r]));
        const ordered = hit.ids.map((id) => byId.get(id)).filter((r): r is (typeof rows)[number] => !!r);
        return { jobs: ordered, total: hit.total, page: input.page, perPage: input.perPage, totalPages: Math.ceil(hit.total / input.perPage) };
      }
      // null → fall through to DB search
    }

    // Active and not past expiry (lazy-expire guard — never show stale listings even if cron lags).
    const conds = [eq(jobs.status, 'active'), or(sql`${jobs.expiresAt} IS NULL`, gte(jobs.expiresAt, sql`now()`))!];
    if (input.q) {
      conds.push(or(ilike(jobs.title, `%${input.q}%`), ilike(jobs.description, `%${input.q}%`))!);
    }
    if (input.category) conds.push(eq(jobs.categorySlug, input.category));
    if (input.emirate) conds.push(eq(jobs.emirateSlug, input.emirate));
    if (input.jobType) conds.push(eq(jobs.jobType, input.jobType));
    if (input.visaStatus) conds.push(eq(jobs.visaStatus, input.visaStatus));
    // Applicant-location filter: show jobs open to the candidate's location (NULL treated as 'both').
    if (input.applicantLocation === 'in_uae') {
      conds.push(or(isNull(jobs.applicantLocation), inArray(jobs.applicantLocation, ['in_uae', 'both']))!);
    } else if (input.applicantLocation === 'outside_uae') {
      conds.push(or(isNull(jobs.applicantLocation), inArray(jobs.applicantLocation, ['outside_uae', 'both']))!);
    }
    if (input.experienceLevel) conds.push(eq(jobs.experienceLevel, input.experienceLevel));
    if (input.salaryMin) conds.push(gte(jobs.salaryMax, input.salaryMin));
    if (input.isRemote) conds.push(eq(jobs.isRemote, true));
    if (input.isFresher) conds.push(eq(jobs.isFresher, true));
    if (input.isUrgent) conds.push(eq(jobs.isUrgent, true));
    if (input.freeZone) conds.push(eq(jobs.freeZone, true));
    if (input.visaProvided) conds.push(eq(jobs.visaProvided, true));
    if (input.postedWithin && input.postedWithin !== 'any') {
      const days = { today: 1, '3days': 3, week: 7, month: 30 }[input.postedWithin];
      conds.push(gte(sql`coalesce(${jobs.publishedAt}, ${jobs.createdAt})`, sql`now() - ${sql.raw(`interval '${days} days'`)}`)!);
    }

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

  /** Semantically similar jobs (pgvector). Empty when embeddings unavailable. */
  similar: publicProcedure.input(z.object({ jobId: z.string().uuid(), limit: z.number().min(1).max(12).default(6) })).query(async ({ ctx, input }) => {
    const ids = await similarJobIds(input.jobId, input.limit);
    if (ids.length) {
      const rows = await ctx.db.query.jobs.findMany({ where: and(inArray(jobs.id, ids), eq(jobs.status, 'active')), with: { company: { columns: { name: true, logoUrl: true, isVerified: true } } } });
      const byId = new Map(rows.map((r) => [r.id, r]));
      const ordered = ids.map((id) => byId.get(id)).filter((r): r is (typeof rows)[number] => !!r);
      if (ordered.length) return ordered;
    }
    // Fallback (no pgvector / no matches): same category + emirate, newest first.
    const src = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId), columns: { categorySlug: true, emirateSlug: true } });
    if (!src) return [];
    return ctx.db.query.jobs.findMany({
      where: and(eq(jobs.status, 'active'), eq(jobs.categorySlug, src.categorySlug), eq(jobs.emirateSlug, src.emirateSlug), sql`${jobs.id} <> ${input.jobId}`),
      orderBy: [desc(jobs.publishedAt)],
      limit: input.limit,
      with: { company: { columns: { name: true, logoUrl: true, isVerified: true } } },
    });
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
    const ep = job.employerId ? await ctx.db.query.employerProfiles.findFirst({ where: eq(employerProfiles.userId, job.employerId), columns: { responseHours: true } }) : null;
    const [activeAgg] = job.employerId
      ? await ctx.db.select({ n: count() }).from(jobs).where(and(eq(jobs.employerId, job.employerId), eq(jobs.status, 'active')))
      : [{ n: 0 }];
    // About-employer visibility: global setting AND per-job flag (both default true).
    const gRow = await ctx.db.query.siteSettings.findFirst({ where: eq(siteSettings.key, 'show_employer_info') });
    const globalOn = (gRow?.value as { enabled?: boolean } | null)?.enabled !== false;
    return { ...job, employerResponseHours: ep?.responseHours ?? null, employerActiveJobs: activeAgg?.n ?? 0, showEmployer: globalOn && job.showEmployerInfo };
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

  /** Most recently published active jobs (homepage Latest Jobs feed). */
  recent: publicProcedure.input(z.object({ limit: z.number().min(1).max(24).default(6) }).optional()).query(
    async ({ ctx, input }) =>
      ctx.db.query.jobs.findMany({
        where: eq(jobs.status, 'active'),
        orderBy: [desc(jobs.publishedAt)],
        limit: input?.limit ?? 6,
        with: { company: { columns: { name: true, logoUrl: true } } },
      }),
  ),

  /** Active walk-in interviews still open (walk_in_last_date >= today, or no last date). */
  walkIns: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50), emirate: z.string().optional(), category: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conds = [
        eq(jobs.status, 'active'),
        eq(jobs.walkIn, true),
        or(sql`${jobs.walkInLastDate} IS NULL`, gte(jobs.walkInLastDate, sql`CURRENT_DATE`))!,
      ];
      if (input.emirate) conds.push(eq(jobs.emirateSlug, input.emirate));
      if (input.category) conds.push(eq(jobs.categorySlug, input.category));
      return ctx.db.query.jobs.findMany({
        where: and(...conds),
        orderBy: [desc(jobs.isFeatured), asc(jobs.walkInDate)],
        limit: input.limit,
        with: { company: { columns: { name: true, logoUrl: true } } },
      });
    }),

  /** Per-category / per-emirate counts for landing pages. */
  stats: publicProcedure.query(async ({ ctx }) =>
    // Cached 5 min in Redis; fail-open to a direct DB query if Redis is down.
    cached('homepage:stats', 300, async () => {
    const [byCategory, byEmirate, totals, seekers] = await Promise.all([
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
      ctx.db.select({ value: count() }).from(users).where(eq(users.role, 'jobseeker')),
    ]);
    return {
      byCategory: Object.fromEntries(byCategory.map((r) => [r.slug, r.value])),
      byEmirate: Object.fromEntries(byEmirate.map((r) => [r.slug, r.value])),
      totalActive: totals[0]?.value ?? 0,
      totalSeekers: seekers[0]?.value ?? 0,
    };
    }),
  ),

  /** Employer: list own jobs. */
  mine: employerProcedure.query(async ({ ctx }) =>
    ctx.db.query.jobs.findMany({
      where: eq(jobs.employerId, ctx.session.user.id),
      orderBy: [desc(jobs.createdAt)],
    }),
  ),

  /** Create a job. Any logged-in user may post — first post auto-upgrades them to employer. */
  create: protectedProcedure.input(jobInputSchema).mutation(async ({ ctx, input }) => {
    const role = ctx.session.user.role;
    const isAdmin = role === 'admin';

    // Free platform: a jobseeker/volunteer who posts a job becomes an employer.
    if (role !== 'employer' && role !== 'admin') {
      await ctx.db.update(users).set({ role: 'employer' }).where(eq(users.id, ctx.session.user.id));
      await ctx.db
        .insert(employerProfiles)
        .values({ userId: ctx.session.user.id, companyName: ctx.session.user.name ?? 'My Company' })
        .onConflictDoNothing();
    }

    const employerProfile = await ctx.db.query.employerProfiles.findFirst({
      where: (p, { eq: e }) => e(p.userId, ctx.session.user.id),
    });
    const slug = await generateJobSlug(input.title, input.emirateSlug, employerProfile?.companyName);

    const [job] = await ctx.db
      .insert(jobs)
      .values({
        ...input,
        slug,
        employerId: ctx.session.user.id,
        companyId: employerProfile?.companyId ?? null,
        status: isAdmin ? 'active' : 'pending',
        publishedAt: isAdmin ? new Date() : null,
        expiresAt: jobExpiry(),
      })
      .returning();

    await audit(ctx.session.user.id, 'job.create', 'job', job!.id);
    await enqueueJobEvent({ jobId: job!.id, event: 'submitted' }).catch(() => {});
    if (job!.status === 'active') {
      await enqueueSearchSync({ type: 'upsert', jobId: job!.id });
      await enqueueJobEvent({ jobId: job!.id, event: 'approved' }).catch(() => {});
    }
    return job;
  }),

  /** Employer: AI quick-post via Claude Haiku — returns a draft (not saved). */
  aiQuickPost: employerProcedure.input(aiQuickPostSchema).mutation(async ({ input }) => {
    const draft = await generateJobFromPrompt(input.prompt);
    return draft;
  }),

  /** Employer: update own job. */
  update: employerProcedure
    .input(z.object({ id: z.string().uuid(), data: jobFieldsSchema.partial().strict() }))
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

  /** Employer: permanently delete own job (admins may delete any). IDOR-checked. */
  deleteOwn: employerProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.id) });
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
    if (existing.employerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    await ctx.db.delete(jobs).where(eq(jobs.id, input.id));
    await enqueueSearchSync({ type: 'delete', jobId: input.id });
    await audit(ctx.session.user.id, 'job.delete', 'job', input.id);
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
        experienceLevel: null, // community referrals have no experience field
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
