import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { jobseekerProfiles, savedJobs, savedJobFolders, jobs, users, eq, and, ne, desc, ilike, sql } from '@ddots/db';
import { jobseekerProfileSchema, slugify } from '@ddots/shared';
import { router, protectedProcedure, publicProcedure, employerProcedure } from '../trpc';
import { presignUpload } from '../lib/r2';
import { notify } from '../lib/helpers';

/** Generate a unique username from a display name (firstname.lastname[.n]). */
async function ensureUsername(db: typeof import('@ddots/db').db, userId: string, name: string | null): Promise<string | null> {
  const existing = await db.query.jobseekerProfiles.findFirst({ where: eq(jobseekerProfiles.userId, userId), columns: { username: true } });
  if (existing?.username) return existing.username;
  const base = (slugify(name ?? 'user') || 'user').replace(/-/g, '.').slice(0, 40) || 'user';
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? base : `${base}.${i + 1}`;
    const clash = await db.query.jobseekerProfiles.findFirst({ where: eq(jobseekerProfiles.username, candidate), columns: { userId: true } });
    if (!clash) return candidate;
  }
  return `${base}.${Date.now().toString(36).slice(-4)}`;
}

export const jobseekersRouter = router({
  /** Current jobseeker profile (creates an empty shell if missing). */
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.jobseekerProfiles.findFirst({
      where: eq(jobseekerProfiles.userId, ctx.session.user.id),
    });
    return profile ?? null;
  }),

  upsertProfile: protectedProcedure.input(jobseekerProfileSchema).mutation(async ({ ctx, input }) => {
    const username = await ensureUsername(ctx.db, ctx.session.user.id, ctx.session.user.name ?? null);
    const [profile] = await ctx.db
      .insert(jobseekerProfiles)
      .values({ userId: ctx.session.user.id, username, lastActive: new Date(), ...input })
      .onConflictDoUpdate({ target: jobseekerProfiles.userId, set: { ...input, lastActive: new Date() } })
      .returning();
    return profile;
  }),

  /** Update talent / availability / privacy settings. */
  updateTalent: protectedProcedure
    .input(z.object({
      availabilityStatus: z.enum(['actively_looking', 'open_to_work', 'not_looking']).optional(),
      visibility: z.enum(['public', 'employers_only', 'hidden']).optional(),
      openToRelocate: z.boolean().optional(),
      nationality: z.string().max(100).optional(),
      languages: z.array(z.string().max(40)).max(20).optional(),
      preferredEmirates: z.array(z.string().max(40)).max(7).optional(),
      preferredJobTypes: z.array(z.string().max(20)).max(6).optional(),
      preferredCategories: z.array(z.string().max(40)).max(16).optional(),
      yearsExperience: z.number().int().min(0).max(60).optional(),
      expectedSalaryMin: z.number().int().nonnegative().nullable().optional(),
      expectedSalaryMax: z.number().int().nonnegative().nullable().optional(),
      showSalary: z.boolean().optional(),
      showWhatsapp: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const username = await ensureUsername(ctx.db, ctx.session.user.id, ctx.session.user.name ?? null);
      const [profile] = await ctx.db
        .insert(jobseekerProfiles)
        .values({ userId: ctx.session.user.id, username, ...input })
        .onConflictDoUpdate({ target: jobseekerProfiles.userId, set: { ...input, username, lastActive: new Date() } })
        .returning();
      return profile;
    }),

  /** Public talent profile by username. Respects visibility + viewer role. */
  publicProfile: publicProcedure.input(z.object({ username: z.string().max(50) })).query(async ({ ctx, input }) => {
    const profile = await ctx.db.query.jobseekerProfiles.findFirst({
      where: eq(jobseekerProfiles.username, input.username),
      with: { user: { columns: { name: true, image: true, id: true } } },
    });
    if (!profile) throw new TRPCError({ code: 'NOT_FOUND' });

    const viewerId = ctx.session?.user?.id;
    const viewerRole = ctx.session?.user?.role;
    const isOwner = viewerId === profile.userId;
    const isEmployer = viewerRole === 'employer' || viewerRole === 'admin';

    if (!isOwner) {
      if (profile.visibility === 'hidden') throw new TRPCError({ code: 'NOT_FOUND' });
      if (profile.visibility === 'employers_only' && !isEmployer) throw new TRPCError({ code: 'FORBIDDEN', message: 'This profile is visible to employers only. Log in as an employer to view.' });
    }

    // Log a view (employer, not owner) — best-effort.
    if (!isOwner && isEmployer) {
      ctx.db.update(jobseekerProfiles).set({ profileViews: sql`${jobseekerProfiles.profileViews} + 1` }).where(eq(jobseekerProfiles.userId, profile.userId)).catch(() => {});
      void notify(profile.userId, 'profile_viewed', 'An employer viewed your profile 👀', { link: `/talent/${profile.username}` });
    }

    // Privacy-gated fields.
    const salary = profile.showSalary ? { min: profile.expectedSalaryMin, max: profile.expectedSalaryMax } : null;
    const whatsapp = profile.showWhatsapp ? profile.phone : null;
    return { ...profile, phone: null, expectedSalaryMin: null, expectedSalaryMax: null, salary, whatsapp, isOwner };
  }),

  /** Employer talent directory search. */
  talentSearch: employerProcedure
    .input(z.object({
      q: z.string().max(120).optional(),
      category: z.string().optional(),
      emirate: z.string().optional(),
      availability: z.enum(['actively_looking', 'open_to_work', 'all']).default('all'),
      page: z.number().min(1).default(1),
    }))
    .query(async ({ ctx, input }) => {
      const conds = [
        ne(jobseekerProfiles.visibility, 'hidden'),
        ne(jobseekerProfiles.availabilityStatus, 'not_looking'),
        sql`${jobseekerProfiles.username} IS NOT NULL`,
      ];
      if (input.category) conds.push(eq(jobseekerProfiles.categorySlug, input.category));
      if (input.emirate) conds.push(eq(jobseekerProfiles.emirateSlug, input.emirate));
      if (input.availability !== 'all') conds.push(eq(jobseekerProfiles.availabilityStatus, input.availability));
      if (input.q) conds.push(sql`(${jobseekerProfiles.headline} ILIKE ${'%' + input.q + '%'} OR ${jobseekerProfiles.skills}::text ILIKE ${'%' + input.q + '%'})`);

      const rows = await ctx.db.query.jobseekerProfiles.findMany({
        where: and(...conds),
        orderBy: [desc(jobseekerProfiles.lastActive)],
        limit: 20,
        offset: (input.page - 1) * 20,
        with: { user: { columns: { name: true, image: true } } },
      });
      return rows.map((r) => ({
        username: r.username,
        name: r.user?.name ?? 'Candidate',
        image: r.user?.image,
        headline: r.headline,
        emirateSlug: r.emirateSlug,
        categorySlug: r.categorySlug,
        visaStatus: r.visaStatus,
        skills: r.skills.slice(0, 4),
        availabilityStatus: r.availabilityStatus,
        yearsExperience: r.yearsExperience,
        salary: r.showSalary ? { min: r.expectedSalaryMin, max: r.expectedSalaryMax } : null,
      }));
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

  // ── Saved-job folders ───────────────────────────────────
  savedFolders: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.query.savedJobFolders.findMany({
      where: eq(savedJobFolders.userId, ctx.session.user.id),
      orderBy: [desc(savedJobFolders.createdAt)],
    }),
  ),

  createFolder: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(60), color: z.string().max(20).default('#2a9aa4') }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(savedJobFolders).values({ userId: ctx.session.user.id, name: input.name, color: input.color }).returning();
      return row;
    }),

  updateFolder: protectedProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1).max(60).optional(), color: z.string().max(20).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      await ctx.db.update(savedJobFolders).set(rest).where(and(eq(savedJobFolders.id, id), eq(savedJobFolders.userId, ctx.session.user.id)));
      return { ok: true };
    }),

  deleteFolder: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(savedJobs).set({ folderId: null }).where(and(eq(savedJobs.userId, ctx.session.user.id), eq(savedJobs.folderId, input.id)));
    await ctx.db.delete(savedJobFolders).where(and(eq(savedJobFolders.id, input.id), eq(savedJobFolders.userId, ctx.session.user.id)));
    return { ok: true };
  }),

  moveSavedJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid(), folderId: z.string().uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      if (input.folderId) {
        const owns = await ctx.db.query.savedJobFolders.findFirst({ where: and(eq(savedJobFolders.id, input.folderId), eq(savedJobFolders.userId, ctx.session.user.id)) });
        if (!owns) throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await ctx.db.update(savedJobs).set({ folderId: input.folderId }).where(and(eq(savedJobs.userId, ctx.session.user.id), eq(savedJobs.jobId, input.jobId)));
      return { ok: true };
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
