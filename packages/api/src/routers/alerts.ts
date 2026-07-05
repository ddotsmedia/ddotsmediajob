import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { jobAlerts, eq, and, desc } from '@ddots/db';
import { jobAlertSchema } from '@ddots/shared';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { enqueueEmail } from '../lib/queue';
import { enforceRateLimit } from '../lib/security';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ddotsmediajobs.com';
const ipOf = (ctx: { headers?: Headers }) => ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export const alertsRouter = router({
  /** Anonymous email alert subscription from the homepage (no account needed). */
  subscribe: publicProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase(),
        keywords: z.string().trim().max(160).optional(),
        emirateSlug: z.string().trim().max(40).optional(),
        categorySlug: z.string().trim().max(40).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`alert-sub:${ipOf(ctx)}`, 10, 3600); // 10/hr per IP
      const existing = await ctx.db.query.jobAlerts.findFirst({ where: eq(jobAlerts.email, input.email) });
      const token = existing?.token ?? randomBytes(32).toString('hex');
      const fields = {
        keywords: input.keywords ?? null,
        emirateSlug: input.emirateSlug ?? null,
        categorySlug: input.categorySlug ?? null,
        isActive: true,
        token,
      };
      if (existing) {
        await ctx.db.update(jobAlerts).set(fields).where(eq(jobAlerts.id, existing.id));
      } else {
        await ctx.db.insert(jobAlerts).values({ email: input.email, channel: 'email', frequency: 'daily', ...fields });
      }
      await enqueueEmail({
        type: 'job-alert-confirm',
        to: input.email,
        keywords: input.keywords ?? null,
        emirate: input.emirateSlug ?? null,
        unsubscribeUrl: `${APP_URL}/unsubscribe?token=${token}`,
      });
      return { ok: true };
    }),

  /** Deactivate an alert via its unsubscribe token (no auth). Always ok. */
  unsubscribe: publicProcedure.input(z.object({ token: z.string().trim().min(10).max(64) })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(jobAlerts).set({ isActive: false }).where(eq(jobAlerts.token, input.token));
    return { ok: true };
  }),

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
