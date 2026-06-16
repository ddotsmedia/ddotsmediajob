import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  blogPosts,
  whatsappGroups,
  salaryReports,
  companies,
  employerProfiles,
  companyFollowers,
  jobs,
  siteSettings,
  eq,
  and,
  desc,
  sql,
  avg,
  count,
  ilike,
  gte,
} from '@ddots/db';
import { slugify } from '@ddots/shared';
import { router, publicProcedure, adminProcedure, protectedProcedure } from '../trpc';
import { sanitizeHtml } from '../lib/security';
import { integrationStatus } from '../lib/integrations';

const blogInput = z.object({
  title: z.string().min(3).max(200),
  excerpt: z.string().max(400).optional(),
  content: z.string().min(10),
  coverUrl: z.string().url().optional(),
  category: z.string().max(60).optional(),
  tags: z.array(z.string()).max(10).default([]),
  isPublished: z.boolean().default(false),
});

export const contentRouter = router({
  /** Public market-insights data: trending skills (from worker) + live counts. */
  marketInsights: publicProcedure.query(async ({ ctx }) => {
    const [trendingRow, byCat, byEm, total] = await Promise.all([
      ctx.db.query.siteSettings.findFirst({ where: eq(siteSettings.key, 'trending_skills') }),
      ctx.db.select({ key: jobs.categorySlug, n: count() }).from(jobs).where(eq(jobs.status, 'active')).groupBy(jobs.categorySlug),
      ctx.db.select({ key: jobs.emirateSlug, n: count() }).from(jobs).where(eq(jobs.status, 'active')).groupBy(jobs.emirateSlug),
      ctx.db.select({ n: count() }).from(jobs).where(eq(jobs.status, 'active')),
    ]);
    const trending = (trendingRow?.value ?? {}) as Record<string, string[]>;
    const map = (rows: { key: string | null; n: number }[]) =>
      rows.map((r) => ({ label: r.key ?? 'unknown', value: Number(r.n) })).sort((a, b) => b.value - a.value);
    return { trending, byCategory: map(byCat), byEmirate: map(byEm), total: Number(total[0]?.n ?? 0) };
  }),

  // ── Blog ───────────────────────────────────────────────
  blogList: publicProcedure
    .input(z.object({ page: z.number().min(1).default(1) }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      return ctx.db.query.blogPosts.findMany({
        where: eq(blogPosts.isPublished, true),
        orderBy: [desc(blogPosts.publishedAt)],
        limit: 12,
        offset: (page - 1) * 12,
        columns: { content: false },
      });
    }),

  blogBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const post = await ctx.db.query.blogPosts.findFirst({ where: eq(blogPosts.slug, input.slug) });
    if (!post || (!post.isPublished && ctx.session?.user?.role !== 'admin')) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    await ctx.db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
      .where(eq(blogPosts.id, post.id));
    return post;
  }),

  blogUpsert: adminProcedure
    .input(blogInput.extend({ id: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      data.content = sanitizeHtml(data.content);
      const slug = slugify(input.title);
      if (id) {
        const [updated] = await ctx.db
          .update(blogPosts)
          .set({ ...data, publishedAt: data.isPublished ? new Date() : null })
          .where(eq(blogPosts.id, id))
          .returning();
        return updated;
      }
      const [created] = await ctx.db
        .insert(blogPosts)
        .values({
          ...data,
          slug,
          authorId: ctx.session.user.id,
          publishedAt: data.isPublished ? new Date() : null,
        })
        .returning();
      return created;
    }),

  /** Admin: publish every unpublished blog post in one shot (fixes an empty /blog). */
  blogPublishAll: adminProcedure.mutation(async ({ ctx }) => {
    const rows = await ctx.db
      .update(blogPosts)
      .set({ isPublished: true, publishedAt: new Date() })
      .where(eq(blogPosts.isPublished, false))
      .returning({ id: blogPosts.id });
    return { published: rows.length };
  }),

  // ── Companies ──────────────────────────────────────────
  companiesList: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: companies.id,
        slug: companies.slug,
        name: companies.name,
        logoUrl: companies.logoUrl,
        industry: companies.industry,
        emirateSlug: companies.emirateSlug,
        isVerified: companies.isVerified,
        ratingAvg: companies.ratingAvg,
        openJobs: sql<number>`count(${jobs.id}) filter (where ${jobs.status} = 'active')::int`,
      })
      .from(companies)
      .leftJoin(jobs, eq(jobs.companyId, companies.id))
      .groupBy(companies.id)
      .orderBy(desc(sql`count(${jobs.id})`));
    return rows;
  }),

  /** Verified employers directory with open-job counts + filters. */
  verifiedEmployers: publicProcedure
    .input(z.object({ industry: z.string().optional(), emirate: z.string().optional(), size: z.string().optional(), hiringNow: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conds = [eq(companies.isVerified, true)];
      if (input?.industry) conds.push(eq(companies.industry, input.industry));
      if (input?.emirate) conds.push(eq(companies.emirateSlug, input.emirate));
      if (input?.size) conds.push(eq(companies.size, input.size as never));
      const rows = await ctx.db
        .select({
          id: companies.id,
          slug: companies.slug,
          name: companies.name,
          logoUrl: companies.logoUrl,
          industry: companies.industry,
          emirateSlug: companies.emirateSlug,
          size: companies.size,
          openJobs: sql<number>`count(${jobs.id}) filter (where ${jobs.status} = 'active')::int`,
        })
        .from(companies)
        .leftJoin(jobs, eq(jobs.companyId, companies.id))
        .where(and(...conds))
        .groupBy(companies.id)
        .orderBy(desc(sql`count(${jobs.id}) filter (where ${jobs.status} = 'active')`));
      return input?.hiringNow ? rows.filter((r) => r.openJobs > 0) : rows;
    }),

  companyBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const company = await ctx.db.query.companies.findFirst({ where: eq(companies.slug, input.slug) });
    if (!company) throw new TRPCError({ code: 'NOT_FOUND' });
    const [openJobs, extras, followerRow, similarRaw] = await Promise.all([
      ctx.db.query.jobs.findMany({
        where: and(eq(jobs.companyId, company.id), eq(jobs.status, 'active')),
        orderBy: [desc(jobs.publishedAt)],
        limit: 20,
      }),
      ctx.db.query.employerProfiles.findFirst({ where: eq(employerProfiles.companyId, company.id) }),
      ctx.db.select({ n: count() }).from(companyFollowers).where(eq(companyFollowers.companyId, company.id)),
      company.industry
        ? ctx.db.query.companies.findMany({ where: eq(companies.industry, company.industry), columns: { slug: true, name: true, logoUrl: true, industry: true, emirateSlug: true }, limit: 4 })
        : Promise.resolve([]),
    ]);
    let isFollowing = false;
    if (ctx.session?.user?.id) {
      const f = await ctx.db.query.companyFollowers.findFirst({
        where: and(eq(companyFollowers.companyId, company.id), eq(companyFollowers.seekerId, ctx.session.user.id)),
      });
      isFollowing = !!f;
    }
    const similar = similarRaw.filter((c) => c.slug !== company.slug).slice(0, 3);
    return { company, openJobs, extras: extras ?? null, followerCount: Number(followerRow[0]?.n ?? 0), isFollowing, similar };
  }),

  /** Seeker follows a company (idempotent). */
  followCompany: protectedProcedure.input(z.object({ companyId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.insert(companyFollowers).values({ companyId: input.companyId, seekerId: ctx.session.user.id }).onConflictDoNothing();
    return { following: true };
  }),

  /** Seeker unfollows a company. */
  unfollowCompany: protectedProcedure.input(z.object({ companyId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(companyFollowers).where(and(eq(companyFollowers.companyId, input.companyId), eq(companyFollowers.seekerId, ctx.session.user.id)));
    return { following: false };
  }),

  // ── WhatsApp groups ────────────────────────────────────
  whatsappGroups: publicProcedure
    .input(z.object({ category: z.string().optional(), emirate: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conds = [eq(whatsappGroups.isActive, true)];
      if (input?.category) conds.push(eq(whatsappGroups.categorySlug, input.category));
      if (input?.emirate) conds.push(eq(whatsappGroups.emirateSlug, input.emirate));
      return ctx.db.query.whatsappGroups.findMany({
        where: and(...conds),
        orderBy: [desc(whatsappGroups.memberCount)],
      });
    }),

  // ── Salary guide ───────────────────────────────────────
  salaryGuide: publicProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          jobTitle: salaryReports.jobTitle,
          categorySlug: salaryReports.categorySlug,
          avgSalary: sql<number>`round(avg(${salaryReports.salaryMonthly}))::int`,
          minSalary: sql<number>`min(${salaryReports.salaryMonthly})::int`,
          maxSalary: sql<number>`max(${salaryReports.salaryMonthly})::int`,
          samples: count(),
        })
        .from(salaryReports)
        .where(input?.category ? eq(salaryReports.categorySlug, input.category) : undefined)
        .groupBy(salaryReports.jobTitle, salaryReports.categorySlug)
        .orderBy(desc(sql`avg(${salaryReports.salaryMonthly})`));
      return rows;
    }),

  /** Compare a salary against reported market data + find jobs paying more. */
  salaryCompare: publicProcedure
    .input(
      z.object({
        title: z.string().min(2).max(160),
        salary: z.number().int().positive(),
        emirateSlug: z.string().max(40).optional(),
        categorySlug: z.string().max(40).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conds = [ilike(salaryReports.jobTitle, `%${input.title}%`)];
      if (input.emirateSlug) conds.push(eq(salaryReports.emirateSlug, input.emirateSlug));
      const [agg] = await ctx.db
        .select({
          avg: sql<number>`coalesce(round(avg(${salaryReports.salaryMonthly})),0)::int`,
          min: sql<number>`coalesce(min(${salaryReports.salaryMonthly}),0)::int`,
          max: sql<number>`coalesce(max(${salaryReports.salaryMonthly}),0)::int`,
          samples: count(),
        })
        .from(salaryReports)
        .where(and(...conds));

      const market = agg ?? { avg: 0, min: 0, max: 0, samples: 0 };
      const verdict = market.samples === 0 ? 'no_data' : input.salary >= market.avg * 1.1 ? 'above' : input.salary <= market.avg * 0.9 ? 'below' : 'at';

      // Jobs paying more than the user's current salary.
      const jobConds = [eq(jobs.status, 'active'), gte(jobs.salaryMax, input.salary)];
      if (input.categorySlug) jobConds.push(eq(jobs.categorySlug, input.categorySlug));
      else jobConds.push(ilike(jobs.title, `%${input.title}%`));
      const higher = await ctx.db.query.jobs.findMany({
        where: and(...jobConds),
        orderBy: [desc(jobs.salaryMax)],
        limit: 3,
        columns: { slug: true, title: true, salaryMin: true, salaryMax: true, salaryPeriod: true, salaryHidden: true, salaryNegotiable: true, emirateSlug: true },
        with: { company: { columns: { name: true } } },
      });

      return { market, verdict, higher };
    }),

  submitSalary: protectedProcedure
    .input(
      z.object({
        jobTitle: z.string().min(2).max(160),
        categorySlug: z.string().optional(),
        emirateSlug: z.string().optional(),
        salaryMonthly: z.number().int().positive(),
        yearsExperience: z.number().int().min(0).max(50).optional(),
        companyName: z.string().max(160).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(salaryReports)
        .values({ ...input, userId: ctx.session.user.id })
        .returning();
      return row;
    }),

  /** Public page-visibility flags for nav/pages (default visible when unset). */
  pageVisibility: publicProcedure.query(async ({ ctx }) => {
    const KEYS = ['salary_guide_visible', 'whatsapp_groups_visible', 'community_visible', 'blog_visible', 'tools_visible'] as const;
    const rows = await ctx.db.query.siteSettings.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return Object.fromEntries(KEYS.map((k) => [k, map.get(k) !== false])) as Record<(typeof KEYS)[number], boolean>;
  }),

  /** Which optional integrations are configured — drives graceful-degradation UI. */
  integrations: publicProcedure.query(() => integrationStatus()),

  /** Public announcement banner config (site_settings key: announcement_banner). */
  announcement: publicProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.query.siteSettings.findFirst({ where: eq(siteSettings.key, 'announcement_banner') });
    const v = (row?.value ?? null) as { enabled?: boolean; text?: string; link?: string } | null;
    if (!v || !v.enabled || !v.text) return null;
    return { text: String(v.text).slice(0, 200), link: v.link ? String(v.link).slice(0, 300) : null };
  }),
});
