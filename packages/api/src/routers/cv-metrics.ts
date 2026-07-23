import { z } from 'zod';
import { cvAiMetrics, desc } from '@ddots/db';
import { router, protectedProcedure, adminProcedure } from '../trpc';

/**
 * CV AI parse telemetry. ai-provider.ts writes rows directly (server-side, for reliability);
 * this router exposes an explicit recordMetric for any other caller plus an admin read for
 * the Phase 2 analytics dashboard.
 */
export const cvMetricsRouter = router({
  recordMetric: protectedProcedure
    .input(
      z.object({
        model: z.enum(['gemini', 'anthropic', 'pdf-fallback']),
        promptVersion: z.string().max(20).default('v1'),
        tokensIn: z.number().int().min(0).default(0),
        tokensOut: z.number().int().min(0).default(0),
        costUsd: z.number().min(0).default(0),
        latencyMs: z.number().int().min(0).default(0),
        errorType: z.string().max(60).nullable().default(null),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(cvAiMetrics).values(input);
      return { ok: true };
    }),

  /** Recent parse metrics for admin analytics (Phase 2). */
  recent: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(cvAiMetrics).orderBy(desc(cvAiMetrics.createdAt)).limit(100);
  }),
});
