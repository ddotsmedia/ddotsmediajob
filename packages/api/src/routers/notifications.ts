import { z } from 'zod';
import { notifications, eq, and, desc, count } from '@ddots/db';
import { router, protectedProcedure } from '../trpc';

export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.query.notifications.findMany({
      where: eq(notifications.userId, ctx.session.user.id),
      orderBy: [desc(notifications.createdAt)],
      limit: 30,
    }),
  ),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const r = await ctx.db
      .select({ v: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.session.user.id), eq(notifications.isRead, false)));
    return r[0]?.v ?? 0;
  }),

  markRead: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.session.user.id)));
    return { ok: true };
  }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, ctx.session.user.id));
    return { ok: true };
  }),
});
