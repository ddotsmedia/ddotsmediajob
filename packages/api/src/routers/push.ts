import { z } from 'zod';
import { pushSubscriptions, eq } from '@ddots/db';
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const pushRouter = router({
  /** VAPID public key for the browser to subscribe (null if push not configured). */
  vapidPublicKey: publicProcedure.query(() => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null),

  subscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url().max(1000), p256dh: z.string().max(500), auth: z.string().max(500) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(pushSubscriptions)
        .values({ userId: ctx.session.user.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth })
        .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: ctx.session.user.id, p256dh: input.p256dh, auth: input.auth } });
      return { ok: true };
    }),

  unsubscribe: protectedProcedure.input(z.object({ endpoint: z.string().url().max(1000) })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, input.endpoint));
    return { ok: true };
  }),
});
