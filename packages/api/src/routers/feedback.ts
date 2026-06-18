import { z } from 'zod';
import { feedback } from '@ddots/db';
import { router, publicProcedure } from '../trpc';
import { enforceRateLimit } from '../lib/security';
import { sendAlertEmail } from '../lib/email';

const ipOf = (ctx: { headers?: Headers }) => ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
const FEEDBACK_TYPES = ['general', 'bug', 'suggestion', 'complaint', 'partnership'] as const;
const ADMIN_EMAIL = process.env.FEEDBACK_EMAIL ?? 'admin@ddotsmediajobs.com';

export const feedbackRouter = router({
  /** Public feedback/contact submission. Rate-limited 3/hr per IP. */
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(160),
        email: z.string().trim().toLowerCase().email().max(255),
        phone: z.string().trim().max(30).optional(),
        subject: z.string().trim().min(2).max(200),
        message: z.string().trim().min(20).max(5000),
        type: z.enum(FEEDBACK_TYPES).default('general'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`feedback:${ipOf(ctx)}`, 3, 3600);
      await ctx.db.insert(feedback).values({
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        subject: input.subject,
        message: input.message,
        type: input.type,
        ipAddress: ipOf(ctx),
        userAgent: ctx.headers?.get('user-agent')?.slice(0, 400) ?? null,
        userId: ctx.session?.user?.id ?? null,
      });
      // Notify admin (best-effort; no-op when email unconfigured).
      await sendAlertEmail(
        ADMIN_EMAIL,
        `New ${input.type} feedback from ${input.name}`,
        `Name: ${input.name}<br/>Email: ${input.email}<br/>Phone: ${input.phone || '—'}<br/>Subject: ${input.subject}<br/><br/>${input.message.replace(/\n/g, '<br/>')}<br/><br/>Received ${new Date().toISOString()}`,
      ).catch(() => {});
      return { ok: true };
    }),
});
