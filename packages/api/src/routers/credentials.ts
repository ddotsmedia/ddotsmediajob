import { createHash } from 'node:crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { seekerCredentials, users, eq, and, desc } from '@ddots/db';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc';
import { notify } from '../lib/helpers';

function makeHash(id: string, seekerId: string): string {
  return createHash('sha256').update(`${id}:${seekerId}:${process.env.CREDENTIAL_SALT ?? 'ddots-credential'}`).digest('hex');
}

export const credentialsRouter = router({
  /** Seeker: list own credentials. */
  mine: protectedProcedure.query(({ ctx }) =>
    ctx.db.query.seekerCredentials.findMany({
      where: eq(seekerCredentials.seekerId, ctx.session.user.id),
      orderBy: [desc(seekerCredentials.createdAt)],
    }),
  ),

  /** Seeker: submit a credential for verification. */
  add: protectedProcedure
    .input(
      z.object({
        credentialType: z.enum(['degree', 'certificate', 'license']),
        issuer: z.string().trim().min(2).max(200),
        title: z.string().trim().max(200).optional(),
        year: z.string().trim().max(10).optional(),
        fileUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(seekerCredentials)
        .values({ ...input, seekerId: ctx.session.user.id, status: 'pending' })
        .returning();
      return row;
    }),

  /** Public: verify a credential by its hash (no auth). */
  verify: publicProcedure.input(z.object({ hash: z.string().max(64) })).query(async ({ ctx, input }) => {
    const cred = await ctx.db.query.seekerCredentials.findFirst({
      where: and(eq(seekerCredentials.verificationHash, input.hash), eq(seekerCredentials.status, 'verified')),
    });
    if (!cred) return null;
    const owner = await ctx.db.query.users.findFirst({ where: eq(users.id, cred.seekerId), columns: { name: true } });
    return {
      holder: owner?.name ?? 'DdotsMediaJobs member',
      credentialType: cred.credentialType,
      issuer: cred.issuer,
      title: cred.title,
      year: cred.year,
      verifiedAt: cred.verifiedAt,
    };
  }),

  // ── Admin verification workflow ─────────────────────────
  pending: adminProcedure.query(({ ctx }) =>
    ctx.db.query.seekerCredentials.findMany({
      where: eq(seekerCredentials.status, 'pending'),
      orderBy: [desc(seekerCredentials.createdAt)],
      limit: 100,
    }),
  ),

  approve: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const cred = await ctx.db.query.seekerCredentials.findFirst({ where: eq(seekerCredentials.id, input.id) });
    if (!cred) throw new TRPCError({ code: 'NOT_FOUND' });
    const hash = makeHash(cred.id, cred.seekerId);
    await ctx.db
      .update(seekerCredentials)
      .set({ status: 'verified', verificationHash: hash, verifiedAt: new Date(), verifiedBy: ctx.session.user.id })
      .where(eq(seekerCredentials.id, input.id));
    await notify(cred.seekerId, 'credential-verified', 'Credential verified ✓', {
      body: `${cred.issuer}${cred.title ? ` — ${cred.title}` : ''} is now verified.`,
      link: '/dashboard/credentials',
    });
    return { hash };
  }),

  reject: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(seekerCredentials).set({ status: 'rejected' }).where(eq(seekerCredentials.id, input.id));
    return { ok: true };
  }),
});
