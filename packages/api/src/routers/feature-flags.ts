import { z } from 'zod';
import { featureFlags, eq } from '@ddots/db';
import { router, publicProcedure, adminProcedure } from '../trpc';
import { getAllFlags, resolveForViewer, clearFlagCache } from '../lib/feature-flags-server';

/** Admin-only flag management (mounted as admin.featureFlags). */
export const featureFlagsAdminRouter = router({
  getAll: adminProcedure.query(async () => getAllFlags()),

  toggle: adminProcedure
    .input(z.object({ key: z.string().min(1).max(60), enabled: z.boolean(), rolloutPercent: z.number().int().min(0).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const flag = await ctx.db.query.featureFlags.findFirst({ where: eq(featureFlags.key, input.key), columns: { id: true } });
      if (!flag) throw new Error('Unknown feature flag');
      await ctx.db
        .update(featureFlags)
        .set({ enabled: input.enabled, rolloutPercent: input.rolloutPercent, updatedAt: new Date() })
        .where(eq(featureFlags.key, input.key));
      clearFlagCache(); // so the next read reflects the change immediately
      return { key: input.key, enabled: input.enabled, rolloutPercent: input.rolloutPercent };
    }),
});

/** Public: resolved on/off map for the current viewer (drives the client context). */
export const featureFlagsRouter = router({
  forViewer: publicProcedure.query(async ({ ctx }) => resolveForViewer(ctx.session?.user?.id ?? null)),
});
