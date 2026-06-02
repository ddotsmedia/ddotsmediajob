import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { jobs, applications, eq, and, desc, sql } from '@ddots/db';
import { applySchema, updateApplicationStatusSchema } from '@ddots/shared';
import { router, protectedProcedure, employerProcedure } from '../trpc';
import { audit } from '../lib/helpers';
import { enqueueEmail } from '../lib/queue';

export const applicationsRouter = router({
  /** Jobseeker: submit an application to a job. */
  submit: protectedProcedure.input(applySchema).mutation(async ({ ctx, input }) => {
    const job = await ctx.db.query.jobs.findFirst({
      where: eq(jobs.id, input.jobId),
      with: { company: { columns: { name: true } } },
    });
    if (!job || job.status !== 'active') throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not available.' });

    const dup = await ctx.db.query.applications.findFirst({
      where: and(eq(applications.jobId, input.jobId), eq(applications.seekerId, ctx.session.user.id)),
    });
    if (dup) throw new TRPCError({ code: 'CONFLICT', message: 'You already applied to this job.' });

    const [app] = await ctx.db
      .insert(applications)
      .values({
        jobId: input.jobId,
        seekerId: ctx.session.user.id,
        coverLetter: input.coverLetter,
        resumeUrl: input.resumeUrl,
        phone: input.phone,
      })
      .returning();

    await ctx.db
      .update(jobs)
      .set({ applicationCount: sql`${jobs.applicationCount} + 1` })
      .where(eq(jobs.id, input.jobId));

    if (ctx.session.user.email) {
      await enqueueEmail({
        type: 'apply-confirmation',
        to: ctx.session.user.email,
        name: ctx.session.user.name ?? 'there',
        jobTitle: job.title,
        companyName: job.company?.name ?? 'the employer',
      });
    }
    await audit(ctx.session.user.id, 'application.create', 'application', app!.id);
    return app;
  }),

  /** Jobseeker: list own applications. */
  mine: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.query.applications.findMany({
      where: eq(applications.seekerId, ctx.session.user.id),
      orderBy: [desc(applications.createdAt)],
      with: { job: { with: { company: { columns: { name: true, logoUrl: true } } } } },
    }),
  ),

  /** Jobseeker: withdraw. */
  withdraw: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const app = await ctx.db.query.applications.findFirst({ where: eq(applications.id, input.id) });
    if (!app || app.seekerId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
    await ctx.db.update(applications).set({ status: 'withdrawn' }).where(eq(applications.id, input.id));
    return { ok: true };
  }),

  /** Employer: applications for one of their jobs (pipeline / Kanban). */
  forJob: employerProcedure.input(z.object({ jobId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId) });
    if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
    if (job.employerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return ctx.db.query.applications.findMany({
      where: eq(applications.jobId, input.jobId),
      orderBy: [desc(applications.createdAt)],
      with: {
        seeker: { columns: { id: true, name: true, email: true, image: true } },
      },
    });
  }),

  /** Employer: move an application along the pipeline. */
  updateStatus: employerProcedure.input(updateApplicationStatusSchema).mutation(async ({ ctx, input }) => {
    const app = await ctx.db.query.applications.findFirst({
      where: eq(applications.id, input.applicationId),
      with: { job: { columns: { employerId: true } } },
    });
    if (!app) throw new TRPCError({ code: 'NOT_FOUND' });
    if (app.job.employerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const [updated] = await ctx.db
      .update(applications)
      .set({ status: input.status, employerNote: input.note })
      .where(eq(applications.id, input.applicationId))
      .returning();
    await audit(ctx.session.user.id, 'application.status', 'application', input.applicationId, {
      status: input.status,
    });
    return updated;
  }),
});
