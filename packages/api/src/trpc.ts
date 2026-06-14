import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Context } from './context';
import { isIpBlocked } from './lib/security-log';

const ipOf = (ctx: Context) => ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Base procedure with fail-open IP blocking (only active when ENABLE_IP_BLOCKING=true). */
const ipGuard = t.procedure.use(async ({ ctx, next }) => {
  if (await isIpBlocked(ipOf(ctx))) throw new TRPCError({ code: 'FORBIDDEN', message: 'Access temporarily blocked.' });
  return next();
});

export const publicProcedure = ipGuard;

/** Requires an authenticated user. */
export const protectedProcedure = ipGuard.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    console.error('[auth] protectedProcedure: no session on request — cookie not received or token invalid.');
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
  }
  return next({ ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } } });
});

/** Requires the employer role. */
export const employerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'employer' && ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Employer access required.' });
  }
  return next({ ctx });
});

/** Requires the admin role. */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required.' });
  }
  return next({ ctx });
});
