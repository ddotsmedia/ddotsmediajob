import { z } from 'zod';
import { interviewScorecards, eq, and, desc } from '@ddots/db';
import { router, employerProcedure } from '../trpc';

const itemSchema = z.object({
  competency: z.string().min(1).max(80),
  weight: z.number().min(0).max(100),
  score: z.number().min(0).max(5),
});

/** Weighted percentage from 0-5 scores and 0-100 weights. */
function weightedTotal(items: { weight: number; score: number }[]): number {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) return 0;
  const sum = items.reduce((s, i) => s + (i.score / 5) * i.weight, 0);
  return Math.round((sum / totalWeight) * 100);
}

export const scorecardsRouter = router({
  list: employerProcedure.input(z.object({ jobId: z.string().uuid().optional() }).optional()).query(async ({ ctx, input }) => {
    const where = input?.jobId
      ? and(eq(interviewScorecards.employerId, ctx.session.user.id), eq(interviewScorecards.jobId, input.jobId))
      : eq(interviewScorecards.employerId, ctx.session.user.id);
    return ctx.db.query.interviewScorecards.findMany({ where, orderBy: [desc(interviewScorecards.weightedTotal)] });
  }),

  create: employerProcedure
    .input(z.object({
      jobId: z.string().uuid().optional(),
      candidateName: z.string().min(1).max(160),
      items: z.array(itemSchema).min(1).max(20),
      recommendation: z.enum(['strong_hire', 'hire', 'maybe', 'no_hire']).optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(interviewScorecards).values({
        employerId: ctx.session.user.id,
        jobId: input.jobId,
        candidateName: input.candidateName,
        items: input.items,
        weightedTotal: weightedTotal(input.items),
        recommendation: input.recommendation,
        notes: input.notes,
      }).returning();
      return row;
    }),

  remove: employerProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(interviewScorecards).where(and(eq(interviewScorecards.id, input.id), eq(interviewScorecards.employerId, ctx.session.user.id)));
    return { ok: true };
  }),
});
