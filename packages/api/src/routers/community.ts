import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { communityPosts, eq, and, isNull, desc, sql } from '@ddots/db';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { audit } from '../lib/helpers';

export const communityRouter = router({
  /** Top-level threads (questions/discussions). */
  threads: publicProcedure
    .input(z.object({ category: z.string().optional(), page: z.number().min(1).default(1) }).optional())
    .query(async ({ ctx, input }) => {
      const conds = [isNull(communityPosts.parentId)];
      if (input?.category) conds.push(eq(communityPosts.categorySlug, input.category));
      return ctx.db.query.communityPosts.findMany({
        where: and(...conds),
        orderBy: [desc(communityPosts.isPinned), desc(communityPosts.createdAt)],
        limit: 20,
        offset: ((input?.page ?? 1) - 1) * 20,
        with: { /* author resolved client-side via id if needed */ },
      });
    }),

  thread: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const post = await ctx.db.query.communityPosts.findFirst({ where: eq(communityPosts.id, input.id) });
    if (!post) throw new TRPCError({ code: 'NOT_FOUND' });
    const replies = await ctx.db.query.communityPosts.findMany({
      where: eq(communityPosts.parentId, input.id),
      orderBy: [desc(communityPosts.upvotes), desc(communityPosts.createdAt)],
    });
    return { post, replies };
  }),

  createThread: protectedProcedure
    .input(
      z.object({
        title: z.string().min(5).max(200),
        body: z.string().min(10).max(8000),
        categorySlug: z.string().max(40).optional(),
        tags: z.array(z.string().max(40)).max(5).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [post] = await ctx.db
        .insert(communityPosts)
        .values({ ...input, authorId: ctx.session.user.id })
        .returning();
      await audit(ctx.session.user.id, 'community.thread', 'community_post', post!.id);
      return post;
    }),

  reply: protectedProcedure
    .input(z.object({ parentId: z.string().uuid(), body: z.string().min(2).max(8000) }))
    .mutation(async ({ ctx, input }) => {
      const parent = await ctx.db.query.communityPosts.findFirst({ where: eq(communityPosts.id, input.parentId) });
      if (!parent) throw new TRPCError({ code: 'NOT_FOUND' });
      const [reply] = await ctx.db
        .insert(communityPosts)
        .values({ parentId: input.parentId, body: input.body, authorId: ctx.session.user.id })
        .returning();
      await ctx.db
        .update(communityPosts)
        .set({ replyCount: sql`${communityPosts.replyCount} + 1` })
        .where(eq(communityPosts.id, input.parentId));
      return reply;
    }),

  upvote: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .update(communityPosts)
      .set({ upvotes: sql`${communityPosts.upvotes} + 1` })
      .where(eq(communityPosts.id, input.id));
    return { ok: true };
  }),
});
