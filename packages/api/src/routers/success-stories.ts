import { z } from 'zod';
import { successStories, eq, desc } from '@ddots/db';
import { router, publicProcedure, adminProcedure } from '../trpc';

const storyInput = z.object({
  seekerName: z.string().min(1).max(160),
  role: z.string().min(1).max(160),
  company: z.string().max(160).optional(),
  emirate: z.string().max(40).optional(),
  story: z.string().min(10).max(4000),
  timeToHire: z.string().max(60).optional(),
  tips: z.string().max(2000).optional(),
  photoUrl: z.string().url().max(1000).optional(),
  isPublished: z.boolean().default(false),
});

export const successStoriesRouter = router({
  list: publicProcedure.query(async ({ ctx }) =>
    ctx.db.query.successStories.findMany({ where: eq(successStories.isPublished, true), orderBy: [desc(successStories.createdAt)], limit: 60 }),
  ),

  all: adminProcedure.query(async ({ ctx }) =>
    ctx.db.query.successStories.findMany({ orderBy: [desc(successStories.createdAt)] }),
  ),

  create: adminProcedure.input(storyInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(successStories).values(input).returning();
    return row;
  }),

  update: adminProcedure.input(storyInput.partial().extend({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    await ctx.db.update(successStories).set(rest).where(eq(successStories.id, id));
    return { ok: true };
  }),

  togglePublish: adminProcedure.input(z.object({ id: z.string().uuid(), isPublished: z.boolean() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(successStories).set({ isPublished: input.isPublished }).where(eq(successStories.id, input.id));
    return { ok: true };
  }),

  remove: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(successStories).where(eq(successStories.id, input.id));
    return { ok: true };
  }),
});
