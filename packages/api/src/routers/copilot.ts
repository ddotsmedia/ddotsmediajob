import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { copilotConversations, copilotMessages, eq, asc, desc } from '@ddots/db';
import { router, protectedProcedure } from '../trpc';
import { sendMessage as providerSend, type CopilotMessage } from '../lib/copilot-provider';
import { isEnabled } from '../lib/feature-flags-server';
import { enforceRateLimit } from '../lib/security';

export const copilotRouter = router({
  /** Send a message; creates the conversation if needed. Gated by the ai_copilot flag. */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid().optional(),
        userMessage: z.string().trim().min(1).max(4000),
        context: z.enum(['jobseeker', 'employer', 'admin']).default('jobseeker'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (!(await isEnabled('ai_copilot', userId))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'AI Copilot is not enabled for your account yet.' });
      }
      await enforceRateLimit(`copilot:${userId}`, 30, 3600);

      // Get or create the conversation (ownership enforced).
      let convId = input.conversationId;
      if (convId) {
        const conv = await ctx.db.query.copilotConversations.findFirst({ where: eq(copilotConversations.id, convId), columns: { userId: true } });
        if (!conv || conv.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN' });
      } else {
        const [c] = await ctx.db.insert(copilotConversations).values({ userId, contextType: input.context }).returning({ id: copilotConversations.id });
        convId = c!.id;
      }

      const history = (await ctx.db
        .select({ role: copilotMessages.role, content: copilotMessages.content })
        .from(copilotMessages)
        .where(eq(copilotMessages.conversationId, convId))
        .orderBy(asc(copilotMessages.createdAt))) as CopilotMessage[];

      await ctx.db.insert(copilotMessages).values({ conversationId: convId, role: 'user', content: input.userMessage });

      const r = await providerSend(history, input.userMessage, input.context);

      await ctx.db.insert(copilotMessages).values({
        conversationId: convId, role: 'assistant', content: r.assistantMessage,
        tokensIn: r.tokens_in, tokensOut: r.tokens_out, costUsd: r.cost_usd, modelUsed: r.model,
      });
      const now = new Date();
      await ctx.db.update(copilotConversations).set({ updatedAt: now, lastMessageAt: now }).where(eq(copilotConversations.id, convId));

      return { conversationId: convId, assistantMessage: r.assistantMessage, tokens_in: r.tokens_in, tokens_out: r.tokens_out, cost_usd: r.cost_usd, model: r.model };
    }),

  getConversation: protectedProcedure.input(z.object({ conversationId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const conv = await ctx.db.query.copilotConversations.findFirst({ where: eq(copilotConversations.id, input.conversationId) });
    if (!conv || conv.userId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
    const messages = await ctx.db
      .select({ id: copilotMessages.id, role: copilotMessages.role, content: copilotMessages.content, createdAt: copilotMessages.createdAt })
      .from(copilotMessages)
      .where(eq(copilotMessages.conversationId, input.conversationId))
      .orderBy(asc(copilotMessages.createdAt));
    return { conversation: conv, messages };
  }),

  listConversations: protectedProcedure.query(async ({ ctx }) =>
    ctx.db
      .select({ id: copilotConversations.id, contextType: copilotConversations.contextType, updatedAt: copilotConversations.updatedAt, lastMessageAt: copilotConversations.lastMessageAt })
      .from(copilotConversations)
      .where(eq(copilotConversations.userId, ctx.session.user.id))
      .orderBy(desc(copilotConversations.updatedAt))
      .limit(10),
  ),
});
