import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { employerTeamMembers, users, notifications, eq, and, desc } from '@ddots/db';
import { router, employerProcedure } from '../trpc';

const roleEnum = z.enum(['admin', 'recruiter', 'viewer']);

export const teamRouter = router({
  list: employerProcedure.query(async ({ ctx }) =>
    ctx.db.query.employerTeamMembers.findMany({
      where: eq(employerTeamMembers.ownerId, ctx.session.user.id),
      orderBy: [desc(employerTeamMembers.createdAt)],
      with: { member: { columns: { name: true } } },
    }),
  ),

  invite: employerProcedure
    .input(z.object({ email: z.string().email().max(255), role: roleEnum }))
    .mutation(async ({ ctx, input }) => {
      const owner = ctx.session.user.id;
      const email = input.email.toLowerCase();
      const existing = await ctx.db.query.employerTeamMembers.findFirst({
        where: and(eq(employerTeamMembers.ownerId, owner), eq(employerTeamMembers.email, email)),
      });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'This email is already on your team.' });

      const linked = await ctx.db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
      if (linked && linked.id === owner) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot invite yourself.' });

      const [row] = await ctx.db.insert(employerTeamMembers).values({
        ownerId: owner, email, role: input.role, userId: linked?.id, status: linked ? 'active' : 'pending',
      }).returning();

      if (linked) {
        await ctx.db.insert(notifications).values({
          userId: linked.id, type: 'team', title: 'Added to a hiring team', body: `You were added as ${input.role}.`, link: '/employer',
        });
      }
      return row;
    }),

  updateRole: employerProcedure.input(z.object({ id: z.string().uuid(), role: roleEnum })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(employerTeamMembers).set({ role: input.role }).where(and(eq(employerTeamMembers.id, input.id), eq(employerTeamMembers.ownerId, ctx.session.user.id)));
    return { ok: true };
  }),

  revoke: employerProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(employerTeamMembers).where(and(eq(employerTeamMembers.id, input.id), eq(employerTeamMembers.ownerId, ctx.session.user.id)));
    return { ok: true };
  }),
});
