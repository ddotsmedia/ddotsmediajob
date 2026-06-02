import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { jobAlerts, eq, and, desc } from '@ddots/db';
import { jobAlertSchema } from '@ddots/shared';
import { router, protectedProcedure } from '../trpc';

export const alertsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.query.jobAlerts.findMany({
      where: eq(jobAlerts.userId, ctx.session.user.id),
      orderBy: [desc(jobAlerts.createdAt)],
    }),
  ),

  create: protectedProcedure.input(jobAlertSchema).mutation(async ({ ctx, input }) => {
    const [alert] = await ctx.db
      .insert(jobAlerts)
      .values({ userId: ctx.session.user.id, ...input })
      .returning();
    return alert;
  }),

  toggle: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const alert = await ctx.db.query.jobAlerts.findFirst({ where: eq(jobAlerts.id, input.id) });
    if (!alert || alert.userId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
    const [updated] = await ctx.db
      .update(jobAlerts)
      .set({ isActive: !alert.isActive })
      .where(eq(jobAlerts.id, input.id))
      .returning();
    return updated;
  }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(jobAlerts)
      .where(and(eq(jobAlerts.id, input.id), eq(jobAlerts.userId, ctx.session.user.id)));
    return { ok: true };
  }),
});
