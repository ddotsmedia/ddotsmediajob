import { z } from 'zod';
import { courseClicks } from '@ddots/db';
import { router, publicProcedure } from '../trpc';

export const learnRouter = router({
  /** Record an affiliate course click (user optional). Best-effort, never throws. */
  trackClick: publicProcedure
    .input(z.object({ courseId: z.string().max(120), provider: z.string().max(120).optional(), url: z.string().url().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.insert(courseClicks).values({
          userId: ctx.session?.user?.id ?? null,
          courseId: input.courseId,
          provider: input.provider,
          url: input.url,
        });
      } catch {
        /* analytics insert must not block the redirect */
      }
      return { ok: true };
    }),
});
