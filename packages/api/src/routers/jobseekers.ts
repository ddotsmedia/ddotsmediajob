import { z } from 'zod';
import { jobseekerProfiles, savedJobs, jobs, users, eq, and, desc } from '@ddots/db';
import { jobseekerProfileSchema } from '@ddots/shared';
import { router, protectedProcedure } from '../trpc';
import { presignUpload } from '../lib/r2';

export const jobseekersRouter = router({
  /** Current jobseeker profile (creates an empty shell if missing). */
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.jobseekerProfiles.findFirst({
      where: eq(jobseekerProfiles.userId, ctx.session.user.id),
    });
    return profile ?? null;
  }),

  upsertProfile: protectedProcedure.input(jobseekerProfileSchema).mutation(async ({ ctx, input }) => {
    const [profile] = await ctx.db
      .insert(jobseekerProfiles)
      .values({ userId: ctx.session.user.id, ...input })
      .onConflictDoUpdate({ target: jobseekerProfiles.userId, set: input })
      .returning();
    return profile;
  }),

  /** Saved jobs list. */
  savedJobs: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.query.savedJobs.findMany({
      where: eq(savedJobs.userId, ctx.session.user.id),
      orderBy: [desc(savedJobs.createdAt)],
      with: { job: { with: { company: { columns: { name: true, logoUrl: true } } } } },
    }),
  ),

  toggleSave: protectedProcedure.input(z.object({ jobId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.savedJobs.findFirst({
      where: and(eq(savedJobs.userId, ctx.session.user.id), eq(savedJobs.jobId, input.jobId)),
    });
    if (existing) {
      await ctx.db
        .delete(savedJobs)
        .where(and(eq(savedJobs.userId, ctx.session.user.id), eq(savedJobs.jobId, input.jobId)));
      return { saved: false };
    }
    await ctx.db.insert(savedJobs).values({ userId: ctx.session.user.id, jobId: input.jobId });
    return { saved: true };
  }),

  isSaved: protectedProcedure.input(z.object({ jobId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const existing = await ctx.db.query.savedJobs.findFirst({
      where: and(eq(savedJobs.userId, ctx.session.user.id), eq(savedJobs.jobId, input.jobId)),
    });
    return { saved: Boolean(existing) };
  }),

  /** Presign a resume upload to R2. */
  presignResume: protectedProcedure
    .input(z.object({ filename: z.string().max(200), contentType: z.string().max(100) }))
    .mutation(async ({ ctx, input }) => {
      const ext = input.filename.split('.').pop() ?? 'pdf';
      const key = `resumes/${ctx.session.user.id}/${Date.now()}.${ext}`;
      return presignUpload(key, input.contentType);
    }),

  /** Presign a profile photo upload to R2. */
  presignAvatar: protectedProcedure
    .input(z.object({ filename: z.string().max(200), contentType: z.string().max(100) }))
    .mutation(async ({ ctx, input }) => {
      const ext = input.filename.split('.').pop() ?? 'jpg';
      const key = `avatars/${ctx.session.user.id}/${Date.now()}.${ext}`;
      return presignUpload(key, input.contentType);
    }),

  /** Save the profile photo URL onto the user. */
  setAvatar: protectedProcedure.input(z.object({ url: z.string().url() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(users).set({ image: input.url }).where(eq(users.id, ctx.session.user.id));
    return { ok: true };
  }),
});
