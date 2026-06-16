import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { jobs, applications, employerProfiles, eq, and, desc, sql } from '@ddots/db';
import { applySchema, updateApplicationStatusSchema } from '@ddots/shared';
import { router, publicProcedure, protectedProcedure, employerProcedure } from '../trpc';
import { audit, notify } from '../lib/helpers';
import { enqueueEmail, enqueueAiScoring } from '../lib/queue';
import { presignUpload } from '../lib/r2';
import { enforceRateLimit, assertUploadType } from '../lib/security';
import { sendWhapiText } from '../lib/import';

const ipOf = (ctx: { headers?: Headers }) => ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export const applicationsRouter = router({
  /** No-login Quick Apply: name + WhatsApp; notifies employer via Whapi. */
  quickApply: publicProcedure
    .input(
      z.object({
        jobId: z.string().uuid(),
        name: z.string().trim().min(2).max(160),
        whatsapp: z.string().trim().min(6).max(30),
        experienceYears: z.string().trim().max(20).optional(),
        message: z.string().trim().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`quickapply:${ipOf(ctx)}`, 3, 3600); // 3 per IP per hour
      const job = await ctx.db.query.jobs.findFirst({
        where: eq(jobs.id, input.jobId),
        with: { company: { columns: { name: true } } },
      });
      if (!job || job.status !== 'active') throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not available.' });

      await ctx.db.insert(applications).values({
        jobId: input.jobId,
        guestName: input.name,
        guestPhone: input.whatsapp,
        coverLetter: input.message || null,
        status: 'quick_apply',
      });
      await ctx.db.update(jobs).set({ applicationCount: sql`${jobs.applicationCount} + 1` }).where(eq(jobs.id, job.id));

      const dest = (job.contactWhatsapp ?? '').replace(/\D/g, '');
      if (dest) {
        const msg = `New application for ${job.title}:\nName: ${input.name} | WA: ${input.whatsapp}\nExperience: ${input.experienceYears || '—'} | ${input.message || ''}\nVia DdotsMediaJobs.com`;
        await sendWhapiText(dest, msg).catch(() => {});
      }
      return { ok: true };
    }),

  /** Jobseeker: submit an application to a job. */
  submit: protectedProcedure.input(applySchema).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(`apply:${ctx.session.user.id}`, 20, 3600);
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

    await enqueueAiScoring({ applicationId: app!.id }).catch(() => {});

    if (ctx.session.user.email) {
      await enqueueEmail({
        type: 'apply-confirmation',
        to: ctx.session.user.email,
        name: ctx.session.user.name ?? 'there',
        jobTitle: job.title,
        companyName: job.company?.name ?? 'the employer',
      });
    }
    await notify(job.employerId, 'application', `New application for ${job.title}`, {
      body: `${ctx.session.user.name ?? 'A candidate'} applied.`,
      link: `/employer/jobs/${job.id}/applications`,
    });
    await audit(ctx.session.user.id, 'application.create', 'application', app!.id);
    return app;
  }),

  /** Guest: apply without an account (name + email + CV). */
  guestApply: publicProcedure
    .input(
      z.object({
        jobId: z.string().uuid(),
        guestName: z.string().trim().min(2).max(160),
        guestEmail: z.string().trim().toLowerCase().email(),
        guestPhone: z.string().trim().max(30).optional(),
        resumeUrl: z.string().url().optional(),
        coverLetter: z.string().trim().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`guestapply:${ipOf(ctx)}`, 20, 3600);
      const job = await ctx.db.query.jobs.findFirst({
        where: eq(jobs.id, input.jobId),
        with: { company: { columns: { name: true } } },
      });
      if (!job || job.status !== 'active') throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not available.' });

      const dup = await ctx.db.query.applications.findFirst({
        where: and(eq(applications.jobId, input.jobId), eq(applications.guestEmail, input.guestEmail)),
      });
      if (dup) throw new TRPCError({ code: 'CONFLICT', message: 'You already applied with this email.' });

      const [app] = await ctx.db
        .insert(applications)
        .values({
          jobId: input.jobId,
          seekerId: null,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          coverLetter: input.coverLetter,
          resumeUrl: input.resumeUrl,
        })
        .returning();

      await ctx.db.update(jobs).set({ applicationCount: sql`${jobs.applicationCount} + 1` }).where(eq(jobs.id, input.jobId));
      await enqueueEmail({
        type: 'apply-confirmation',
        to: input.guestEmail,
        name: input.guestName,
        jobTitle: job.title,
        companyName: job.company?.name ?? 'the employer',
      });
      await notify(job.employerId, 'application', `New application for ${job.title}`, {
        body: `${input.guestName} applied (guest).`,
        link: `/employer/jobs/${job.id}/applications`,
      });
      await enqueueAiScoring({ applicationId: app!.id }).catch(() => {});
      return { id: app!.id };
    }),

  /** Guest: presign a CV upload to R2 (no account required). */
  presignGuestCv: publicProcedure
    .input(z.object({ filename: z.string().max(200), contentType: z.string().max(100) }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`guestcv:${ipOf(ctx)}`, 20, 3600);
      assertUploadType('cv', input.contentType, input.filename);
      const ext = input.filename.split('.').pop() ?? 'pdf';
      const key = `guest-cv/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
      return presignUpload(key, input.contentType);
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
      with: { job: { columns: { employerId: true, title: true, slug: true } } },
    });
    if (!app) throw new TRPCError({ code: 'NOT_FOUND' });
    if (app.job.employerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    // Stamp first response time (any status off the inbound states) for the response-time badge.
    const isResponse = input.status !== 'applied' && input.status !== 'quick_apply';
    const [updated] = await ctx.db
      .update(applications)
      .set({ status: input.status, employerNote: input.note, ...(isResponse && !app.respondedAt ? { respondedAt: new Date() } : {}) })
      .where(eq(applications.id, input.applicationId))
      .returning();

    // Recompute the employer's average first-response time (hours) over their jobs.
    if (isResponse && !app.respondedAt) {
      const [agg] = await ctx.db
        .select({ hrs: sql<number>`round(avg(extract(epoch from ${applications.respondedAt} - ${applications.createdAt}) / 3600))::int` })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .where(and(eq(jobs.employerId, app.job.employerId), sql`${applications.respondedAt} is not null`));
      if (agg?.hrs != null) {
        await ctx.db.update(employerProfiles).set({ responseHours: agg.hrs }).where(eq(employerProfiles.userId, app.job.employerId));
      }
    }

    if (app.seekerId) {
      await notify(app.seekerId, 'application-status', `Your application is now "${input.status}"`, {
        body: app.job.title,
        link: '/dashboard/applications',
      });
    }
    await audit(ctx.session.user.id, 'application.status', 'application', input.applicationId, {
      status: input.status,
    });
    return updated;
  }),
});
