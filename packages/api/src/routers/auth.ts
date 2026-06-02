import { TRPCError } from '@trpc/server';
import { users, employerProfiles, jobseekerProfiles, eq } from '@ddots/db';
import { registerSchema } from '@ddots/shared';
import { hashPassword } from '@ddots/auth/password';
import { router, publicProcedure } from '../trpc';
import { enqueueEmail } from '../lib/queue';
import { audit } from '../lib/helpers';

export const authRouter = router({
  /** Register a jobseeker or employer with email + password. */
  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.users.findFirst({ where: eq(users.email, input.email) });
    if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'An account with this email already exists.' });

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

    await enqueueEmail({ type: 'welcome', to: input.email, name: input.name, role: input.role });
    await audit(user!.id, 'user.register', 'user', user!.id, { role: input.role });
    return { id: user!.id, email: user!.email };
  }),
});
