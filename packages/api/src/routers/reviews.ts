import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { companyReviews, companies, employerProfiles, eq, and, desc, sql, avg, count } from '@ddots/db';
import { router, publicProcedure, protectedProcedure, employerProcedure } from '../trpc';

export const reviewsRouter = router({
  /** Approved reviews for a company. */
  forCompany: publicProcedure.input(z.object({ companyId: z.string().uuid() })).query(async ({ ctx, input }) =>
    ctx.db.query.companyReviews.findMany({
      where: and(eq(companyReviews.companyId, input.companyId), eq(companyReviews.isApproved, true)),
      orderBy: [desc(companyReviews.createdAt)],
      limit: 50,
    }),
  ),

  /** Rating breakdown + recommend rate for a company. */
  summary: publicProcedure.input(z.object({ companyId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select({
        n: count(),
        overall: avg(companyReviews.rating),
        culture: avg(companyReviews.cultureRating),
        salary: avg(companyReviews.salaryRating),
        management: avg(companyReviews.managementRating),
        worklife: avg(companyReviews.worklifeRating),
        recommend: sql<number>`avg(case when ${companyReviews.wouldRecommend} then 1.0 else 0.0 end)`,
      })
      .from(companyReviews)
      .where(and(eq(companyReviews.companyId, input.companyId), eq(companyReviews.isApproved, true)));
    const r = rows[0];
    const num = (v: unknown) => Math.round(Number(v ?? 0) * 10) / 10;
    return { count: Number(r?.n ?? 0), overall: num(r?.overall), culture: num(r?.culture), salary: num(r?.salary), management: num(r?.management), worklife: num(r?.worklife), recommendPct: Math.round(Number(r?.recommend ?? 0) * 100) };
  }),

  create: protectedProcedure
    .input(
      z.object({
        companyId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        cultureRating: z.number().int().min(1).max(5).optional(),
        salaryRating: z.number().int().min(1).max(5).optional(),
        managementRating: z.number().int().min(1).max(5).optional(),
        worklifeRating: z.number().int().min(1).max(5).optional(),
        title: z.string().max(200).optional(),
        pros: z.string().max(3000).optional(),
        cons: z.string().max(3000).optional(),
        advice: z.string().max(3000).optional(),
        wouldRecommend: z.boolean().optional(),
        isAnonymous: z.boolean().default(true),
        jobTitle: z.string().max(160).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [review] = await ctx.db
        .insert(companyReviews)
        .values({ ...input, authorId: ctx.session.user.id })
        .returning();

      // Recompute the company's aggregate rating from approved reviews.
      const agg = await ctx.db
        .select({ avg: avg(companyReviews.rating), c: count() })
        .from(companyReviews)
        .where(and(eq(companyReviews.companyId, input.companyId), eq(companyReviews.isApproved, true)));
      await ctx.db
        .update(companies)
        .set({ ratingAvg: Number(agg[0]?.avg ?? 0), ratingCount: agg[0]?.c ?? 0 })
        .where(eq(companies.id, input.companyId));

      return review;
    }),

  /** Employer publicly responds to a review of their own company. */
  respond: employerProcedure
    .input(z.object({ reviewId: z.string().uuid(), response: z.string().min(1).max(3000) }))
    .mutation(async ({ ctx, input }) => {
      const review = await ctx.db.query.companyReviews.findFirst({ where: eq(companyReviews.id, input.reviewId) });
      if (!review) throw new TRPCError({ code: 'NOT_FOUND' });
      const profile = await ctx.db.query.employerProfiles.findFirst({ where: eq(employerProfiles.userId, ctx.session.user.id) });
      if (!profile || profile.companyId !== review.companyId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your company.' });
      await ctx.db.update(companyReviews).set({ employerResponse: input.response }).where(eq(companyReviews.id, input.reviewId));
      return { ok: true };
    }),
});
