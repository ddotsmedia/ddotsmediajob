import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  blogPosts,
  whatsappGroups,
  salaryReports,
  companies,
  jobs,
  eq,
  and,
  desc,
  sql,
  avg,
  count,
} from '@ddots/db';
import { slugify } from '@ddots/shared';
import { router, publicProcedure, adminProcedure, protectedProcedure } from '../trpc';
import { sanitizeHtml } from '../lib/security';

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

  companyBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const company = await ctx.db.query.companies.findFirst({ where: eq(companies.slug, input.slug) });
    if (!company) throw new TRPCError({ code: 'NOT_FOUND' });
    const openJobs = await ctx.db.query.jobs.findMany({
      where: and(eq(jobs.companyId, company.id), eq(jobs.status, 'active')),
      orderBy: [desc(jobs.publishedAt)],
      limit: 20,
    });
    return { company, openJobs };
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
});
