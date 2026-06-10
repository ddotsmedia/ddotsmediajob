import { randomBytes } from 'crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { videoInterviews, videoResponses, notifications, eq, and, desc } from '@ddots/db';
import { router, publicProcedure, employerProcedure } from '../trpc';
import { presignUpload } from '../lib/r2';
import { enforceRateLimit } from '../lib/security';

const questionSchema = z.object({ text: z.string().min(1).max(500), timeLimitSec: z.number().int().min(10).max(300) });

async function interviewByToken(db: typeof import('@ddots/db').db, token: string) {
  const iv = await db.query.videoInterviews.findFirst({ where: and(eq(videoInterviews.shareToken, token), eq(videoInterviews.isActive, true)) });
  if (!iv) throw new TRPCError({ code: 'NOT_FOUND', message: 'Interview link not found or closed.' });
  return iv;
}

export const videoInterviewsRouter = router({
  // ── Employer ──
  mine: employerProcedure.query(async ({ ctx }) =>
    ctx.db.query.videoInterviews.findMany({
      where: eq(videoInterviews.employerId, ctx.session.user.id),
      orderBy: [desc(videoInterviews.createdAt)],
      with: { responses: { columns: { id: true } } },
    }),
  ),

  create: employerProcedure
    .input(z.object({ jobId: z.string().uuid().optional(), title: z.string().min(2).max(200), questions: z.array(questionSchema).min(1).max(10) }))
    .mutation(async ({ ctx, input }) => {
      const shareToken = randomBytes(12).toString('hex');
      const [row] = await ctx.db.insert(videoInterviews).values({ employerId: ctx.session.user.id, jobId: input.jobId, title: input.title, questions: input.questions, shareToken }).returning();
      return row;
    }),

  responses: employerProcedure.input(z.object({ interviewId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const iv = await ctx.db.query.videoInterviews.findFirst({ where: eq(videoInterviews.id, input.interviewId) });
    if (!iv || iv.employerId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
    return ctx.db.query.videoResponses.findMany({ where: eq(videoResponses.interviewId, input.interviewId), orderBy: [desc(videoResponses.createdAt)] });
  }),

  toggleActive: employerProcedure.input(z.object({ id: z.string().uuid(), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(videoInterviews).set({ isActive: input.isActive }).where(and(eq(videoInterviews.id, input.id), eq(videoInterviews.employerId, ctx.session.user.id)));
    return { ok: true };
  }),

  remove: employerProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(videoInterviews).where(and(eq(videoInterviews.id, input.id), eq(videoInterviews.employerId, ctx.session.user.id)));
    return { ok: true };
  }),

  // ── Public (candidate) ──
  getByToken: publicProcedure.input(z.object({ token: z.string().max(32) })).query(async ({ ctx, input }) => {
    const iv = await interviewByToken(ctx.db, input.token);
    return { title: iv.title, questions: iv.questions };
  }),

  presignVideo: publicProcedure
    .input(z.object({ token: z.string().max(32), questionIndex: z.number().int().min(0).max(9) }))
    .mutation(async ({ ctx, input }) => {
      await interviewByToken(ctx.db, input.token);
      await enforceRateLimit(`vid:presign:${input.token}`, 60, 3600);
      const key = `video-responses/${input.token}/${input.questionIndex}-${randomBytes(8).toString('hex')}.webm`;
      return presignUpload(key, 'video/webm');
    }),

  submitResponse: publicProcedure
    .input(z.object({
      token: z.string().max(32),
      applicantName: z.string().min(1).max(160),
      applicantEmail: z.string().email().max(255).optional(),
      answers: z.array(z.object({ questionText: z.string().max(500), videoUrl: z.string().url().max(1000) })).min(1).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const iv = await interviewByToken(ctx.db, input.token);
      await enforceRateLimit(`vid:submit:${input.token}`, 20, 3600);
      const [row] = await ctx.db.insert(videoResponses).values({ interviewId: iv.id, applicantName: input.applicantName, applicantEmail: input.applicantEmail, answers: input.answers }).returning();
      await ctx.db.insert(notifications).values({ userId: iv.employerId, type: 'video_response', title: 'New video interview response', body: `${input.applicantName} responded to "${iv.title}".`, link: '/employer/video-interviews' });
      return { id: row?.id };
    }),
});
