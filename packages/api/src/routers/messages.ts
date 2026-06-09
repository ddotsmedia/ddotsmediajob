import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db, directMessages, applications, notifications, users, eq, and, or, inArray, desc, asc, count } from '@ddots/db';
import { router, protectedProcedure } from '../trpc';

type Db = typeof db;

const UNLOCK_STATUSES = ['shortlisted', 'interview', 'offered', 'hired'] as const;

/** True if `me` and `other` share a shortlisted+ application (either direction). */
async function canMessage(database: Db, me: string, other: string): Promise<boolean> {
  const apps = await database.query.applications.findMany({
    where: and(
      inArray(applications.status, [...UNLOCK_STATUSES]),
      or(eq(applications.seekerId, me), eq(applications.seekerId, other)),
    ),
    with: { job: { columns: { employerId: true } } },
  });
  return apps.some(
    (a) =>
      (a.seekerId === me && a.job?.employerId === other) ||
      (a.seekerId === other && a.job?.employerId === me),
  );
}

export const messagesRouter = router({
  /** Conversations: latest message per other-party + unread count. */
  conversations: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.session.user.id;
    const rows = await ctx.db.query.directMessages.findMany({
      where: or(eq(directMessages.senderId, me), eq(directMessages.receiverId, me)),
      orderBy: [desc(directMessages.createdAt)],
      limit: 400,
      with: {
        sender: { columns: { id: true, name: true } },
        receiver: { columns: { id: true, name: true } },
      },
    });
    const byOther = new Map<string, { otherId: string; name: string; lastBody: string; lastAt: Date; unread: number }>();
    for (const m of rows) {
      const isMine = m.senderId === me;
      const other = isMine ? m.receiver : m.sender;
      if (!other) continue;
      const existing = byOther.get(other.id);
      if (!existing) {
        byOther.set(other.id, {
          otherId: other.id, name: other.name ?? 'User', lastBody: m.body, lastAt: m.createdAt,
          unread: !isMine && !m.isRead ? 1 : 0,
        });
      } else if (!isMine && !m.isRead) {
        existing.unread += 1;
      }
    }
    return [...byOther.values()];
  }),

  /** Total unread (for nav badge). */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [r] = await ctx.db
      .select({ n: count() })
      .from(directMessages)
      .where(and(eq(directMessages.receiverId, ctx.session.user.id), eq(directMessages.isRead, false)));
    return r?.n ?? 0;
  }),

  /** Thread with another user; marks their messages to me as read. */
  thread: protectedProcedure.input(z.object({ withUserId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const me = ctx.session.user.id;
    const other = input.withUserId;
    const messages = await ctx.db.query.directMessages.findMany({
      where: or(
        and(eq(directMessages.senderId, me), eq(directMessages.receiverId, other)),
        and(eq(directMessages.senderId, other), eq(directMessages.receiverId, me)),
      ),
      orderBy: [asc(directMessages.createdAt)],
      limit: 500,
    });
    await ctx.db
      .update(directMessages)
      .set({ isRead: true })
      .where(and(eq(directMessages.senderId, other), eq(directMessages.receiverId, me), eq(directMessages.isRead, false)));
    const otherUser = await ctx.db.query.users.findFirst({ where: eq(users.id, other), columns: { name: true } });
    const unlocked = await canMessage(ctx.db, me, other);
    return {
      otherName: otherUser?.name ?? 'User',
      unlocked,
      messages: messages.map((m) => ({ id: m.id, body: m.body, mine: m.senderId === me, createdAt: m.createdAt })),
    };
  }),

  /** Send a message — only if a shortlist link exists. */
  send: protectedProcedure
    .input(z.object({ toUserId: z.string().uuid(), body: z.string().min(1).max(4000), jobId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.user.id;
      if (input.toUserId === me) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot message yourself.' });
      const unlocked = await canMessage(ctx.db, me, input.toUserId);
      if (!unlocked) throw new TRPCError({ code: 'FORBIDDEN', message: 'Messaging unlocks once the candidate is shortlisted.' });
      const [msg] = await ctx.db
        .insert(directMessages)
        .values({ senderId: me, receiverId: input.toUserId, jobId: input.jobId, body: input.body })
        .returning();
      await ctx.db.insert(notifications).values({
        userId: input.toUserId, type: 'message', title: 'New message', body: input.body.slice(0, 120), link: '/dashboard/messages',
      });
      return msg;
    }),
});
