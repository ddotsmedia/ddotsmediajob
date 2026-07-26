import { z } from 'zod';
import { sql } from '@ddots/db';
import { router, adminProcedure } from '../trpc';

const rowsOf = <T>(r: unknown): T[] => (r as { rows?: T[] }).rows ?? (r as T[]);

/** CTA click → application funnel analytics (mounted as admin.ctaAnalytics). */
export const ctaAnalyticsRouter = router({
  funnel: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      const cutoff = sql`now() - (${input.days}::text || ' days')::interval`;
      const totals = await ctx.db.execute(sql`
        SELECT
          (SELECT count(*)::int FROM cta_clicks WHERE clicked_at >= ${cutoff}) AS total_clicks,
          (SELECT count(*)::int FROM cta_conversions WHERE converted_at >= ${cutoff} AND conversion_type = 'application_started') AS started,
          (SELECT count(*)::int FROM cta_conversions WHERE converted_at >= ${cutoff} AND conversion_type = 'application_completed') AS completed`);
      const byCta = await ctx.db.execute(sql`SELECT cta_type, count(*)::int AS n FROM cta_clicks WHERE clicked_at >= ${cutoff} GROUP BY 1 ORDER BY 2 DESC`);
      const bySource = await ctx.db.execute(sql`SELECT COALESCE(source_page, 'unknown') AS source_page, count(*)::int AS n FROM cta_clicks WHERE clicked_at >= ${cutoff} GROUP BY 1 ORDER BY 2 DESC`);
      const series = await ctx.db.execute(sql`
        SELECT to_char(d, 'YYYY-MM-DD') AS date,
          (SELECT count(*)::int FROM cta_clicks WHERE clicked_at::date = d) AS clicks,
          (SELECT count(*)::int FROM cta_conversions WHERE converted_at::date = d AND conversion_type = 'application_completed') AS completed
        FROM generate_series(current_date - (${input.days - 1})::int, current_date, interval '1 day') d
        ORDER BY 1`);

      const t = rowsOf<{ total_clicks: number; started: number; completed: number }>(totals)[0] ?? { total_clicks: 0, started: 0, completed: 0 };
      return {
        total_clicks: t.total_clicks,
        applies_started: t.started,
        applies_completed: t.completed,
        by_cta_type: rowsOf<{ cta_type: string; n: number }>(byCta),
        by_source_page: rowsOf<{ source_page: string; n: number }>(bySource),
        time_series: rowsOf<{ date: string; clicks: number; completed: number }>(series),
        conversion_rates: {
          clickToApply: t.total_clicks ? Math.round((t.completed / t.total_clicks) * 100) : 0,
          applyToCompletion: t.started ? Math.round((t.completed / t.started) * 100) : 0,
        },
      };
    }),
});
