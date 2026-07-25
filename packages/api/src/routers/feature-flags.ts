import { z } from 'zod';
import { featureFlags, eq, asc } from '@ddots/db';
import { router, publicProcedure, adminProcedure } from '../trpc';
import { resolveForViewer, clearFlagCache } from '../lib/feature-flags-server';

/** Admin-only flag management (mounted as admin.featureFlags). */
export const featureFlagsAdminRouter = router({
  /** Full flag rows (incl. name/description) for the admin toggle UI. */
  getAll: adminProcedure.query(async ({ ctx }) =>
    ctx.db
      .select({ key: featureFlags.key, name: featureFlags.name, description: featureFlags.description, enabled: featureFlags.enabled, rolloutPercent: featureFlags.rolloutPercent })
      .from(featureFlags)
      .orderBy(asc(featureFlags.key)),
  ),

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

  /** Update only the rollout percentage for a flag. */
  updateRollout: adminProcedure
    .input(z.object({ key: z.string().min(1).max(60), rolloutPercent: z.number().int().min(0).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const flag = await ctx.db.query.featureFlags.findFirst({ where: eq(featureFlags.key, input.key), columns: { id: true } });
      if (!flag) throw new Error('Unknown feature flag');
      await ctx.db.update(featureFlags).set({ rolloutPercent: input.rolloutPercent, updatedAt: new Date() }).where(eq(featureFlags.key, input.key));
      clearFlagCache();
      return { success: true, key: input.key, rolloutPercent: input.rolloutPercent };
    }),
});

/** Public: resolved on/off map for the current viewer (drives the client context). */
export const featureFlagsRouter = router({
  forViewer: publicProcedure.query(async ({ ctx }) => resolveForViewer(ctx.session?.user?.id ?? null)),
});
