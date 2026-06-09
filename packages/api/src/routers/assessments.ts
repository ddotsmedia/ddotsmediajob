import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { skillAssessments, assessmentResults, eq, and, desc, gte } from '@ddots/db';
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const assessmentsRouter = router({
  /** Public: list active assessments (no answers). */
  list: publicProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.category
        ? and(eq(skillAssessments.isActive, true), eq(skillAssessments.categorySlug, input.category))
        : eq(skillAssessments.isActive, true);
      const rows = await ctx.db.query.skillAssessments.findMany({ where, orderBy: [desc(skillAssessments.createdAt)] });
      return rows.map((a) => ({
        id: a.id, slug: a.slug, title: a.title, categorySlug: a.categorySlug, description: a.description,
        questionCount: a.questions.length, timeLimitSec: a.timeLimitSec, passScore: a.passScore,
        badgeName: a.badgeName, badgeColor: a.badgeColor,
      }));
    }),

  /** Public: load one assessment for taking — strips correct answers. */
  get: publicProcedure.input(z.object({ slug: z.string().max(80) })).query(async ({ ctx, input }) => {
    const a = await ctx.db.query.skillAssessments.findFirst({
      where: and(eq(skillAssessments.slug, input.slug), eq(skillAssessments.isActive, true)),
    });
    if (!a) throw new TRPCError({ code: 'NOT_FOUND' });
    return {
      id: a.id, slug: a.slug, title: a.title, categorySlug: a.categorySlug, description: a.description,
      timeLimitSec: a.timeLimitSec, passScore: a.passScore, badgeName: a.badgeName, badgeColor: a.badgeColor,
      questions: a.questions.map((q) => ({ q: q.q, options: q.options })),
    };
  }),

  /** Grade an attempt server-side and persist the result. */
  submit: protectedProcedure
    .input(z.object({ assessmentId: z.string().uuid(), answers: z.array(z.number().int().min(0).max(10)).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const a = await ctx.db.query.skillAssessments.findFirst({ where: eq(skillAssessments.id, input.assessmentId) });
      if (!a) throw new TRPCError({ code: 'NOT_FOUND' });
      const total = a.questions.length;
      let correct = 0;
      a.questions.forEach((q, i) => { if (input.answers[i] === q.correct) correct++; });
      const score = total ? Math.round((correct / total) * 100) : 0;
      const passed = score >= a.passScore;
      await ctx.db.insert(assessmentResults).values({ assessmentId: a.id, userId: ctx.session.user.id, score, passed });
      return { score, passed, correct, total, badgeName: a.badgeName, badgeColor: a.badgeColor };
    }),

  /** Current user's earned results + badges. */
  myResults: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.query.assessmentResults.findMany({
      where: eq(assessmentResults.userId, ctx.session.user.id),
      orderBy: [desc(assessmentResults.completedAt)],
      with: { assessment: { columns: { title: true, slug: true, badgeName: true, badgeColor: true, categorySlug: true } } },
    }),
  ),

  /** Top 10 passing scores in the last 7 days. */
  leaderboard: publicProcedure.input(z.object({ category: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const rows = await ctx.db.query.assessmentResults.findMany({
      where: and(gte(assessmentResults.completedAt, weekAgo), eq(assessmentResults.passed, true)),
      orderBy: [desc(assessmentResults.score), desc(assessmentResults.completedAt)],
      limit: 50,
      with: { user: { columns: { name: true } }, assessment: { columns: { title: true, categorySlug: true, badgeName: true } } },
    });
    const filtered = input?.category ? rows.filter((r) => r.assessment?.categorySlug === input.category) : rows;
    return filtered.slice(0, 10).map((r) => ({
      name: r.user?.name ?? 'Anonymous', score: r.score, title: r.assessment?.title ?? '',
      badge: r.assessment?.badgeName ?? '', completedAt: r.completedAt,
    }));
  }),
});
