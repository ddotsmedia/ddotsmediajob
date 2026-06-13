import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { amaSessions, amaQuestions, eq, and, desc, sql } from '@ddots/db';
import { slugify } from '@ddots/shared';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc';
import { sanitizeHtml } from '../lib/security';

export const amaRouter = router({
  /** Public: sessions grouped for the listing page. */
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.amaSessions.findMany({ orderBy: [desc(amaSessions.scheduledAt)] });
    return {
      upcoming: rows.filter((r) => r.status === 'upcoming' || r.status === 'live'),
      past: rows.filter((r) => r.status === 'past'),
    };
  }),

  /** Public: one session + its questions (top-voted first). */
  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const session = await ctx.db.query.amaSessions.findFirst({ where: eq(amaSessions.slug, input.slug) });
    if (!session) throw new TRPCError({ code: 'NOT_FOUND' });
    const questions = await ctx.db.query.amaQuestions.findMany({
      where: eq(amaQuestions.sessionId, session.id),
      orderBy: [desc(amaQuestions.upvotes), desc(amaQuestions.createdAt)],
      limit: 100,
    });
    return { session, questions };
  }),

  /** Logged-in user submits a question. */
  submitQuestion: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid(), question: z.string().trim().min(5).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(amaQuestions)
        .values({ sessionId: input.sessionId, userId: ctx.session.user.id, question: input.question })
        .returning();
      return row;
    }),

  upvoteQuestion: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(amaQuestions).set({ upvotes: sql`${amaQuestions.upvotes} + 1` }).where(eq(amaQuestions.id, input.id));
    return { ok: true };
  }),

  // ── Admin ──────────────────────────────────────────────
  adminCreate: adminProcedure
    .input(
      z.object({
        expertName: z.string().min(2).max(160),
        expertTitle: z.string().max(200).optional(),
        expertCompany: z.string().max(160).optional(),
        expertPhoto: z.string().url().optional(),
        topic: z.string().min(3).max(240),
        description: z.string().max(5000).optional(),
        scheduledAt: z.coerce.date().optional(),
        durationMin: z.number().int().min(15).max(240).default(60),
        recordingUrl: z.string().url().optional(),
        summary: z.string().max(5000).optional(),
        status: z.enum(['upcoming', 'live', 'past']).default('upcoming'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = `${slugify(input.topic)}-${slugify(input.expertName)}`.slice(0, 150);
      const [row] = await ctx.db
        .insert(amaSessions)
        .values({ ...input, slug, description: input.description ? sanitizeHtml(input.description) : null })
        .returning();
      return row;
    }),

  adminAnswer: adminProcedure
    .input(z.object({ id: z.string().uuid(), answer: z.string().trim().min(1).max(3000) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(amaQuestions).set({ answer: input.answer, answered: true }).where(eq(amaQuestions.id, input.id));
      return { ok: true };
    }),
});
