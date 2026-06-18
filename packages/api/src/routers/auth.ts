import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { users, employerProfiles, jobseekerProfiles, verificationTokens, sessions, referralCodes, referrals, eq, and, sql } from '@ddots/db';
import { registerSchema, passwordSchema } from '@ddots/shared';
import { hashPassword } from '@ddots/auth/password';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { enqueueEmail } from '../lib/queue';
import { audit } from '../lib/helpers';
import { enforceRateLimit, isPwnedPassword } from '../lib/security';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ddotsmediajobs.com';
const token = () => randomBytes(32).toString('hex');
// Store only the SHA-256 of email/reset tokens — a DB leak can't be replayed.
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
const ipOf = (ctx: { headers?: Headers }) => ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export const authRouter = router({
  /** Register a jobseeker or employer with email + password. */
  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(`register:${ipOf(ctx)}`, 20, 3600); // CGNAT-friendly: 20/hr per IP
    const existing = await ctx.db.query.users.findFirst({ where: eq(users.email, input.email) });
    if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'An account with this email already exists.' });

    if (await isPwnedPassword(input.password)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This password has appeared in a known data breach. Please choose a different one.' });
    }

    const passwordHash = await hashPassword(input.password);
    const [user] = await ctx.db
      .insert(users)
      .values({ name: input.name, email: input.email, passwordHash, role: input.role })
      .returning();

    if (input.role === 'employer') {
      await ctx.db.insert(employerProfiles).values({ userId: user!.id, companyName: input.name });
    } else {
      await ctx.db.insert(jobseekerProfiles).values({ userId: user!.id });
    }

    // Welcome + email verification link.
    await enqueueEmail({ type: 'welcome', to: input.email, name: input.name, role: input.role });
    const t = token();
    await ctx.db.insert(verificationTokens).values({
      identifier: `verify:${input.email}`,
      token: hashToken(t),
      expires: new Date(Date.now() + 24 * 3600_000),
    });
    await enqueueEmail({
      type: 'verify-email',
      to: input.email,
      name: input.name,
      verifyUrl: `${APP_URL}/verify-email?token=${t}`,
    });

    // Referral conversion (best-effort).
    if (input.ref) {
      try {
        const code = await ctx.db.query.referralCodes.findFirst({ where: eq(referralCodes.code, input.ref) });
        if (code && code.userId !== user!.id) {
          await ctx.db.insert(referrals).values({ referrerId: code.userId, referredId: user!.id, referralCode: input.ref, source: 'register', converted: true, conversionType: 'registration', rewardPoints: 50, convertedAt: new Date() }).onConflictDoNothing();
          await ctx.db.update(referralCodes).set({ totalConversions: sql`${referralCodes.totalConversions} + 1` }).where(eq(referralCodes.id, code.id));
        }
      } catch (err) {
        console.error('[register] referral conversion failed:', err instanceof Error ? err.message : err);
      }
    }

    await audit(user!.id, 'user.register', 'user', user!.id, { role: input.role });
    return { id: user!.id, email: user!.email };
  }),

  /** Request a password-reset link. Always returns ok (no account enumeration). */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email().toLowerCase() }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`pwreset:${ipOf(ctx)}`, 5, 3600); // CGNAT-friendly: 5/hr per IP
      const user = await ctx.db.query.users.findFirst({ where: eq(users.email, input.email) });
      if (user) {
        const t = token();
        await ctx.db
          .delete(verificationTokens)
          .where(eq(verificationTokens.identifier, `reset:${input.email}`));
        await ctx.db.insert(verificationTokens).values({
          identifier: `reset:${input.email}`,
          token: hashToken(t),
          expires: new Date(Date.now() + 3600_000),
        });
        await enqueueEmail({
          type: 'password-reset',
          to: input.email,
          name: user.name ?? 'there',
          resetUrl: `${APP_URL}/reset-password?token=${t}`,
        });
      }
      return { ok: true };
    }),

  /** Complete a password reset with the emailed token. */
  resetPassword: publicProcedure
    .input(z.object({ token: z.string().min(10), password: passwordSchema }))
    .mutation(async ({ ctx, input }) => {
      const vt = await ctx.db.query.verificationTokens.findFirst({
        where: eq(verificationTokens.token, hashToken(input.token)),
      });
      if (!vt || !vt.identifier.startsWith('reset:') || vt.expires < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This reset link is invalid or has expired.' });
      }
      const email = vt.identifier.slice('reset:'.length);
      const passwordHash = await hashPassword(input.password);
      const target = await ctx.db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
      await ctx.db.update(users).set({ passwordHash }).where(eq(users.email, email));
      // Session rotation: invalidate all existing sessions after a password change.
      if (target) await ctx.db.delete(sessions).where(eq(sessions.userId, target.id));
      await ctx.db
        .delete(verificationTokens)
        .where(and(eq(verificationTokens.identifier, vt.identifier), eq(verificationTokens.token, vt.token)));
      return { ok: true };
    }),

  /** Verify an email address from the emailed token. */
  verifyEmail: publicProcedure.input(z.object({ token: z.string().min(10) })).mutation(async ({ ctx, input }) => {
    const vt = await ctx.db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.token, hashToken(input.token)),
    });
    if (!vt || !vt.identifier.startsWith('verify:') || vt.expires < new Date()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This verification link is invalid or has expired.' });
    }
    const email = vt.identifier.slice('verify:'.length);
    await ctx.db.update(users).set({ emailVerified: new Date() }).where(eq(users.email, email));
    await ctx.db
      .delete(verificationTokens)
      .where(and(eq(verificationTokens.identifier, vt.identifier), eq(verificationTokens.token, vt.token)));
    return { ok: true };
  }),

  /** Resend the verification email for the logged-in user. */
  resendVerification: protectedProcedure.mutation(async ({ ctx }) => {
    const email = ctx.session.user.email;
    if (!email) throw new TRPCError({ code: 'BAD_REQUEST' });
    const t = token();
    await ctx.db.delete(verificationTokens).where(eq(verificationTokens.identifier, `verify:${email}`));
    await ctx.db.insert(verificationTokens).values({
      identifier: `verify:${email}`,
      token: hashToken(t),
      expires: new Date(Date.now() + 24 * 3600_000),
    });
    await enqueueEmail({
      type: 'verify-email',
      to: email,
      name: ctx.session.user.name ?? 'there',
      verifyUrl: `${APP_URL}/verify-email?token=${t}`,
    });
    return { ok: true };
  }),
});
