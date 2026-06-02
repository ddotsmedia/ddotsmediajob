import { z } from 'zod';
import { companyReviews, companies, eq, and, desc, sql, avg, count } from '@ddots/db';
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const reviewsRouter = router({
  /** Approved reviews for a company. */
  forCompany: publicProcedure.input(z.object({ companyId: z.string().uuid() })).query(async ({ ctx, input }) =>
    ctx.db.query.companyReviews.findMany({
      where: and(eq(companyReviews.companyId, input.companyId), eq(companyReviews.isApproved, true)),
      orderBy: [desc(companyReviews.createdAt)],
      limit: 50,
    }),
  ),

  create: protectedProcedure
    .input(
      z.object({
        companyId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(200).optional(),
        pros: z.string().max(3000).optional(),
        cons: z.string().max(3000).optional(),
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
});
