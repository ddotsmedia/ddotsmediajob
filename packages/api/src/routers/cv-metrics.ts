import { z } from 'zod';
import { cvAiMetrics, desc, sql } from '@ddots/db';
import { router, protectedProcedure, adminProcedure } from '../trpc';

const rowsOf = <T>(r: unknown): T[] => (r as { rows?: T[] }).rows ?? (r as T[]);

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

  /** Admin cost dashboard: YTD summary + daily-by-model series + model breakdown + recent 10. */
  dashboard: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      const cutoff = sql`now() - (${input.days}::text || ' days')::interval`;
      const daily = await ctx.db.execute(sql`
        SELECT to_char(created_at, 'YYYY-MM-DD') AS date, model,
               SUM(tokens_out)::int AS tokens_out, ROUND(AVG(latency_ms))::int AS avg_latency,
               SUM(cost_usd)::float8 AS cost, COUNT(*)::int AS cnt
        FROM cv_ai_metrics WHERE created_at >= ${cutoff}
        GROUP BY 1, 2 ORDER BY 1`);
      const breakdown = await ctx.db.execute(sql`
        SELECT model, COUNT(*)::int AS cnt FROM cv_ai_metrics WHERE created_at >= ${cutoff} GROUP BY model`);
      const summary = await ctx.db.execute(sql`
        SELECT COALESCE(SUM(cost_usd), 0)::float8 AS total_cost, COUNT(*)::int AS cnt,
               GREATEST(1, COUNT(DISTINCT to_char(created_at, 'YYYY-MM-DD')))::int AS active_days
        FROM cv_ai_metrics WHERE created_at >= date_trunc('year', now())`);
      const recent = await ctx.db.execute(sql`
        SELECT created_at, model, tokens_in::int AS tokens_in, tokens_out::int AS tokens_out,
               cost_usd::float8 AS cost_usd, latency_ms::int AS latency_ms, error_type
        FROM cv_ai_metrics ORDER BY created_at DESC LIMIT 10`);

      const s = rowsOf<{ total_cost: number; cnt: number; active_days: number }>(summary)[0] ?? { total_cost: 0, cnt: 0, active_days: 1 };
      const dailyAvg = s.total_cost / (s.active_days || 1);
      return {
        summary: { totalCostYtd: s.total_cost, count: s.cnt, dailyAvg, monthlyProjection: dailyAvg * 30 },
        daily: rowsOf<{ date: string; model: string; tokens_out: number; avg_latency: number; cost: number; cnt: number }>(daily),
        breakdown: rowsOf<{ model: string; cnt: number }>(breakdown),
        recent: rowsOf<{ created_at: string; model: string; tokens_in: number; tokens_out: number; cost_usd: number; latency_ms: number; error_type: string | null }>(recent),
      };
    }),
});
