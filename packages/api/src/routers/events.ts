import { z } from 'zod';
import { hiringEvents, eq, and, gte, asc, desc } from '@ddots/db';
import { router, publicProcedure, employerProcedure } from '../trpc';

const eventInput = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(4000).optional(),
  emirate: z.string().max(40).optional(),
  rolesText: z.string().max(500).optional(),
  startsAt: z.coerce.date(),
  durationMin: z.number().int().min(15).max(480).default(60),
  meetingUrl: z.string().url().max(500).optional(),
  maxAttendees: z.number().int().min(1).max(100000).optional(),
  isPublished: z.boolean().default(false),
});

export const eventsRouter = router({
  /** Public: upcoming published events. */
  upcoming: publicProcedure.query(async ({ ctx }) =>
    ctx.db.query.hiringEvents.findMany({
      where: and(eq(hiringEvents.isPublished, true), gte(hiringEvents.startsAt, new Date())),
      orderBy: [asc(hiringEvents.startsAt)],
      limit: 50,
      with: { employer: { columns: { name: true } } },
    }),
  ),

  /** Employer's own events. */
  mine: employerProcedure.query(async ({ ctx }) =>
    ctx.db.query.hiringEvents.findMany({
      where: eq(hiringEvents.employerId, ctx.session.user.id),
      orderBy: [desc(hiringEvents.startsAt)],
    }),
  ),

  create: employerProcedure.input(eventInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(hiringEvents).values({ ...input, employerId: ctx.session.user.id }).returning();
    return row;
  }),

  togglePublish: employerProcedure.input(z.object({ id: z.string().uuid(), isPublished: z.boolean() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(hiringEvents).set({ isPublished: input.isPublished }).where(and(eq(hiringEvents.id, input.id), eq(hiringEvents.employerId, ctx.session.user.id)));
    return { ok: true };
  }),

  remove: employerProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(hiringEvents).where(and(eq(hiringEvents.id, input.id), eq(hiringEvents.employerId, ctx.session.user.id)));
    return { ok: true };
  }),
});
