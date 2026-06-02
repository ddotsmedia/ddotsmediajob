import { z } from 'zod';
import { users, eq } from '@ddots/db';
import { router, protectedProcedure } from '../trpc';
import { audit } from '../lib/helpers';

/**
 * Premium plan management. Payment-provider integration (Stripe/Tap/Telr) is
 * pluggable — `upgrade` records the plan; wire a webhook to call it after a
 * successful charge. For now it activates a 30-day premium window directly.
 */
export const billingRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
      columns: { plan: true, premiumUntil: true },
    });
    const active = user?.plan === 'premium' && (!user.premiumUntil || user.premiumUntil > new Date());
    return { plan: user?.plan ?? 'free', premiumUntil: user?.premiumUntil ?? null, active };
  }),

  upgrade: protectedProcedure
    .input(z.object({ months: z.number().int().min(1).max(12).default(1) }))
    .mutation(async ({ ctx, input }) => {
      const until = new Date(Date.now() + input.months * 30 * 86_400_000);
      await ctx.db
        .update(users)
        .set({ plan: 'premium', premiumUntil: until })
        .where(eq(users.id, ctx.session.user.id));
      await audit(ctx.session.user.id, 'billing.upgrade', 'user', ctx.session.user.id, { months: input.months });
      return { plan: 'premium', premiumUntil: until };
    }),

  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.update(users).set({ plan: 'free', premiumUntil: null }).where(eq(users.id, ctx.session.user.id));
    return { plan: 'free' };
  }),
});
