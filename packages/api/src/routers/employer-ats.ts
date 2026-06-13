import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  jobs,
  applications,
  users,
  hiringPipelines,
  applicationStages,
  scorecards,
  scorecardResults,
  talentPool,
  offerLetters,
  candidateNotes,
  approvalRequests,
  referenceCheckRequests,
  eq,
  and,
  inArray,
  desc,
} from '@ddots/db';
import { router, employerProcedure, publicProcedure } from '../trpc';
import { audit, notify } from '../lib/helpers';
import { chat, structured, MODEL_FAST, MODEL_SMART } from '../lib/anthropic';
import { wrapUserContent } from '../lib/security';

const DEFAULT_STAGES = [
  { id: 'new', name: 'New', order: 0 },
  { id: 'screened', name: 'Screened', order: 1 },
  { id: 'phone', name: 'Phone Interview', order: 2 },
  { id: 'test', name: 'Skills Test', order: 3 },
  { id: 'interview', name: 'Final Interview', order: 4 },
  { id: 'offer', name: 'Offer', order: 5 },
  { id: 'hired', name: 'Hired', order: 6 },
];

// ── IDOR helpers — every resource verified against the session employer ──
async function assertJobOwner(ctx: { db: typeof import('@ddots/db').db; session: { user: { id: string } } }, jobId: string) {
  const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, jobId), columns: { id: true, employerId: true, title: true } });
  if (!job || job.employerId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your job.' });
  return job;
}
async function assertAppOwner(ctx: { db: typeof import('@ddots/db').db; session: { user: { id: string } } }, applicationId: string) {
  const app = await ctx.db.query.applications.findFirst({ where: eq(applications.id, applicationId) });
  if (!app) throw new TRPCError({ code: 'NOT_FOUND' });
  await assertJobOwner(ctx, app.jobId);
  return app;
}

export const employerAtsRouter = router({
  // ── Phase 1: pipeline + stage moves ─────────────────────
  pipeline: employerProcedure.input(z.object({ jobId: z.string().uuid() })).query(async ({ ctx, input }) => {
    await assertJobOwner(ctx, input.jobId);
    const existing = await ctx.db.query.hiringPipelines.findFirst({ where: eq(hiringPipelines.jobId, input.jobId) });
    return existing?.stages ?? DEFAULT_STAGES;
  }),

  updatePipeline: employerProcedure
    .input(z.object({ jobId: z.string().uuid(), stages: z.array(z.object({ id: z.string().max(40), name: z.string().max(60), order: z.number().int() })).min(1).max(10) }))
    .mutation(async ({ ctx, input }) => {
      await assertJobOwner(ctx, input.jobId);
      await ctx.db
        .insert(hiringPipelines)
        .values({ jobId: input.jobId, stages: input.stages })
        .onConflictDoUpdate({ target: hiringPipelines.jobId, set: { stages: input.stages, updatedAt: new Date() } });
      return { ok: true };
    }),

  moveApplication: employerProcedure
    .input(z.object({ applicationId: z.string().uuid(), stageId: z.string().max(40), note: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const app = await assertAppOwner(ctx, input.applicationId);
      await ctx.db.insert(applicationStages).values({ applicationId: app.id, jobId: app.jobId, stageId: input.stageId, movedBy: ctx.session.user.id, notes: input.note });
      await audit(ctx.session.user.id, 'ats.moveApplication', 'application', app.id, { stageId: input.stageId });
      return { ok: true };
    }),

  applicationStage: employerProcedure.input(z.object({ applicationId: z.string().uuid() })).query(async ({ ctx, input }) => {
    await assertAppOwner(ctx, input.applicationId);
    const last = await ctx.db.query.applicationStages.findFirst({ where: eq(applicationStages.applicationId, input.applicationId), orderBy: [desc(applicationStages.movedAt)] });
    return last?.stageId ?? 'new';
  }),

  bulkMoveApplications: employerProcedure
    .input(z.object({ applicationIds: z.array(z.string().uuid()).min(1).max(100), stageId: z.string().max(40) }))
    .mutation(async ({ ctx, input }) => {
      for (const id of input.applicationIds) {
        const app = await assertAppOwner(ctx, id);
        await ctx.db.insert(applicationStages).values({ applicationId: app.id, jobId: app.jobId, stageId: input.stageId, movedBy: ctx.session.user.id });
      }
      await audit(ctx.session.user.id, 'ats.bulkMove', 'application', undefined, { count: input.applicationIds.length, stageId: input.stageId });
      return { moved: input.applicationIds.length };
    }),

  bulkReject: employerProcedure
    .input(z.object({ applicationIds: z.array(z.string().uuid()).min(1).max(100), note: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      for (const id of input.applicationIds) {
        const app = await assertAppOwner(ctx, id);
        await ctx.db.update(applications).set({ status: 'rejected' }).where(eq(applications.id, app.id));
        await ctx.db.insert(applicationStages).values({ applicationId: app.id, jobId: app.jobId, stageId: 'rejected', movedBy: ctx.session.user.id, notes: input.note });
      }
      await audit(ctx.session.user.id, 'ats.bulkReject', 'application', undefined, { count: input.applicationIds.length });
      return { rejected: input.applicationIds.length };
    }),

  // ── Phase 4: talent pool ────────────────────────────────
  talentPoolAdd: employerProcedure
    .input(z.object({ candidateId: z.string().uuid(), notes: z.string().max(2000).optional(), tags: z.array(z.string().max(40)).max(20).optional(), followUpDate: z.string().optional(), addedFromJobId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(talentPool)
        .values({ employerId: ctx.session.user.id, candidateId: input.candidateId, notes: input.notes, tags: input.tags ?? [], followUpDate: input.followUpDate ?? null, addedFromJobId: input.addedFromJobId ?? null })
        .onConflictDoNothing();
      return { ok: true };
    }),

  talentPoolList: employerProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: talentPool.id, candidateId: talentPool.candidateId, notes: talentPool.notes, tags: talentPool.tags,
        followUpDate: talentPool.followUpDate, createdAt: talentPool.createdAt,
        name: users.name, email: users.email, image: users.image,
      })
      .from(talentPool)
      .leftJoin(users, eq(users.id, talentPool.candidateId))
      .where(eq(talentPool.employerId, ctx.session.user.id))
      .orderBy(desc(talentPool.createdAt));
    return rows;
  }),

  talentPoolRemove: employerProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(talentPool).where(and(eq(talentPool.id, input.id), eq(talentPool.employerId, ctx.session.user.id)));
    return { ok: true };
  }),

  reEngageCandidate: employerProcedure
    .input(z.object({ candidateName: z.string().max(160), role: z.string().max(160), company: z.string().max(160), salary: z.string().max(40).optional() }))
    .mutation(async ({ input }) => {
      const msg = await chat(
        'You write short, warm UAE recruiter outreach messages (<60 words).',
        [{ role: 'user', content: wrapUserContent(`Candidate: ${input.candidateName}\nRole: ${input.role}\nCompany: ${input.company}\nSalary: ${input.salary ?? 'competitive'}`) }],
        { model: MODEL_FAST, maxTokens: 200 },
      );
      return { message: msg };
    }),

  // ── Phase 5: scorecards ─────────────────────────────────
  createScorecard: employerProcedure
    .input(z.object({ name: z.string().min(2).max(200), jobId: z.string().uuid().optional(), competencies: z.array(z.object({ name: z.string().max(120), weight: z.number().int().min(0).max(100), description: z.string().max(500).optional() })).min(1).max(10) }))
    .mutation(async ({ ctx, input }) => {
      if (input.jobId) await assertJobOwner(ctx, input.jobId);
      const [row] = await ctx.db.insert(scorecards).values({ employerId: ctx.session.user.id, jobId: input.jobId ?? null, name: input.name, competencies: input.competencies }).returning();
      return row;
    }),

  listScorecards: employerProcedure.input(z.object({ jobId: z.string().uuid().optional() }).optional()).query(({ ctx, input }) =>
    ctx.db.query.scorecards.findMany({
      where: input?.jobId ? and(eq(scorecards.employerId, ctx.session.user.id), eq(scorecards.jobId, input.jobId)) : eq(scorecards.employerId, ctx.session.user.id),
      orderBy: [desc(scorecards.createdAt)],
    }),
  ),

  generateScorecard: employerProcedure.input(z.object({ jobTitle: z.string().min(2).max(160) })).mutation(async ({ input }) => {
    const TOOL = { name: 'scorecard', description: 'Generate interview competencies for a role.', input_schema: { type: 'object' as const, properties: { competencies: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, weight: { type: 'integer' }, description: { type: 'string' } }, required: ['name', 'weight', 'description'] } } }, required: ['competencies'] } };
    const out = await structured<{ competencies: { name: string; weight: number; description: string }[] }>(
      'You design UAE interview scorecards. Return 4-6 weighted competencies summing to 100.',
      wrapUserContent(`Role: ${input.jobTitle}`), TOOL as never, { model: MODEL_FAST, maxTokens: 600 },
    );
    return out.competencies.slice(0, 10);
  }),

  fillScorecard: employerProcedure
    .input(z.object({ scorecardId: z.string().uuid(), applicationId: z.string().uuid(), scores: z.record(z.string(), z.number().int().min(1).max(5)), recommendation: z.string().max(30).optional(), notes: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertAppOwner(ctx, input.applicationId);
      const card = await ctx.db.query.scorecards.findFirst({ where: eq(scorecards.id, input.scorecardId) });
      if (!card || card.employerId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      const total = Math.round(card.competencies.reduce((s, c) => s + (input.scores[c.name] ?? 0) * (c.weight / 100), 0) * 20); // 1-5 → 0-100
      const [row] = await ctx.db.insert(scorecardResults).values({ scorecardId: input.scorecardId, applicationId: input.applicationId, interviewerId: ctx.session.user.id, scores: input.scores, totalScore: total, recommendation: input.recommendation, notes: input.notes }).returning();
      return row;
    }),

  scorecardResults: employerProcedure.input(z.object({ applicationId: z.string().uuid() })).query(async ({ ctx, input }) => {
    await assertAppOwner(ctx, input.applicationId);
    return ctx.db.query.scorecardResults.findMany({ where: eq(scorecardResults.applicationId, input.applicationId), orderBy: [desc(scorecardResults.createdAt)] });
  }),

  // ── Phase 10: candidate notes ───────────────────────────
  addNote: employerProcedure
    .input(z.object({ applicationId: z.string().uuid(), content: z.string().min(1).max(4000), isPrivate: z.boolean().default(false), mentions: z.array(z.string().max(60)).max(10).optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertAppOwner(ctx, input.applicationId);
      const [row] = await ctx.db.insert(candidateNotes).values({ applicationId: input.applicationId, authorId: ctx.session.user.id, content: input.content, isPrivate: input.isPrivate, mentions: input.mentions ?? [] }).returning();
      return row;
    }),

  listNotes: employerProcedure.input(z.object({ applicationId: z.string().uuid() })).query(async ({ ctx, input }) => {
    await assertAppOwner(ctx, input.applicationId);
    const rows = await ctx.db
      .select({ id: candidateNotes.id, content: candidateNotes.content, isPrivate: candidateNotes.isPrivate, createdAt: candidateNotes.createdAt, authorId: candidateNotes.authorId, authorName: users.name })
      .from(candidateNotes)
      .leftJoin(users, eq(users.id, candidateNotes.authorId))
      .where(eq(candidateNotes.applicationId, input.applicationId))
      .orderBy(desc(candidateNotes.createdAt));
    // Hide other people's private notes.
    return rows.filter((r) => !r.isPrivate || r.authorId === ctx.session.user.id);
  }),

  // ── Phase 11: approvals ─────────────────────────────────
  createApproval: employerProcedure.input(z.object({ type: z.enum(['job', 'offer']), entityId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(approvalRequests).values({ requestedBy: ctx.session.user.id, jobId: input.type === 'job' ? input.entityId : null, offerId: input.type === 'offer' ? input.entityId : null }).returning();
    return row;
  }),

  listApprovals: employerProcedure.query(({ ctx }) => ctx.db.query.approvalRequests.findMany({ orderBy: [desc(approvalRequests.createdAt)], limit: 100 })),

  decideApproval: employerProcedure.input(z.object({ id: z.string().uuid(), decision: z.enum(['approved', 'rejected']), comment: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(approvalRequests).set({ status: input.decision, approvedBy: ctx.session.user.id, comment: input.comment, decidedAt: new Date() }).where(eq(approvalRequests.id, input.id));
    await audit(ctx.session.user.id, 'ats.decideApproval', 'approval', input.id, { decision: input.decision });
    return { ok: true };
  }),

  // ── Phase 6: offer letters ──────────────────────────────
  createOffer: employerProcedure
    .input(z.object({ applicationId: z.string().uuid(), salary: z.number().int().positive(), startDate: z.string().optional(), probationMonths: z.number().int().min(0).max(12).default(6), benefits: z.array(z.string().max(80)).max(20).optional(), role: z.string().max(160), candidateName: z.string().max(160), company: z.string().max(160), generate: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const app = await assertAppOwner(ctx, input.applicationId);
      let content = '';
      if (input.generate) {
        content = await chat(
          'You draft MOHRE-compliant UAE employment offer letters. Include probation, notice period, gratuity entitlement, 8h/day 48h/week hours, 30 days annual leave. Professional, complete, ready to send.',
          [{ role: 'user', content: wrapUserContent(`Candidate: ${input.candidateName}\nRole: ${input.role}\nCompany: ${input.company}\nSalary: AED ${input.salary}/month\nStart: ${input.startDate ?? 'TBD'}\nProbation: ${input.probationMonths} months\nBenefits: ${(input.benefits ?? []).join(', ')}`) }],
          { model: MODEL_FAST, maxTokens: 1500 },
        );
      }
      const [row] = await ctx.db.insert(offerLetters).values({
        applicationId: input.applicationId, jobId: app.jobId, employerId: ctx.session.user.id, candidateId: app.seekerId ?? null,
        salary: input.salary, startDate: input.startDate ?? null, probationMonths: input.probationMonths, benefits: input.benefits ?? [],
        content, token: randomUUID().replace(/-/g, ''), status: 'draft',
      }).returning();
      return row;
    }),

  updateOffer: employerProcedure.input(z.object({ id: z.string().uuid(), content: z.string().max(20000) })).mutation(async ({ ctx, input }) => {
    const offer = await ctx.db.query.offerLetters.findFirst({ where: eq(offerLetters.id, input.id) });
    if (!offer || offer.employerId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
    await ctx.db.update(offerLetters).set({ content: input.content }).where(eq(offerLetters.id, input.id));
    return { ok: true };
  }),

  sendOffer: employerProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const offer = await ctx.db.query.offerLetters.findFirst({ where: eq(offerLetters.id, input.id) });
    if (!offer || offer.employerId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
    await ctx.db.update(offerLetters).set({ status: 'sent', sentAt: new Date() }).where(eq(offerLetters.id, input.id));
    if (offer.candidateId) await notify(offer.candidateId, 'offer', 'You received a job offer 🎉', { body: 'Open to review and respond.', link: `/offer/${offer.token}` });
    await audit(ctx.session.user.id, 'ats.sendOffer', 'offer', offer.id);
    return { token: offer.token };
  }),

  listOffers: employerProcedure.query(({ ctx }) => ctx.db.query.offerLetters.findMany({ where: eq(offerLetters.employerId, ctx.session.user.id), orderBy: [desc(offerLetters.createdAt)], limit: 100 })),

  // ── Phase 6 public: candidate offer view/respond ────────
  offerByToken: publicProcedure.input(z.object({ token: z.string().max(64) })).query(async ({ ctx, input }) => {
    const offer = await ctx.db.query.offerLetters.findFirst({ where: eq(offerLetters.token, input.token) });
    if (!offer || offer.status === 'draft') throw new TRPCError({ code: 'NOT_FOUND' });
    if (offer.status === 'sent') await ctx.db.update(offerLetters).set({ status: 'viewed', viewedAt: new Date() }).where(eq(offerLetters.id, offer.id));
    return offer;
  }),

  respondOffer: publicProcedure
    .input(z.object({ token: z.string().max(64), decision: z.enum(['accepted', 'declined']), reason: z.string().max(1000).optional(), signature: z.string().max(160).optional() }))
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.db.query.offerLetters.findFirst({ where: eq(offerLetters.token, input.token) });
      if (!offer || ['accepted', 'declined', 'draft'].includes(offer.status)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Offer not available.' });
      await ctx.db.update(offerLetters).set({ status: input.decision, respondedAt: new Date(), declineReason: input.decision === 'declined' ? input.reason : null }).where(eq(offerLetters.id, offer.id));
      await notify(offer.employerId, 'offer-response', `Offer ${input.decision}`, { body: input.signature ? `Signed by ${input.signature}` : undefined, link: '/employer/offers' });
      return { ok: true };
    }),

  // ── Phase 9: reference checks ───────────────────────────
  requestReferenceCheck: employerProcedure
    .input(z.object({ applicationId: z.string().uuid(), refereeName: z.string().min(2).max(160), refereeEmail: z.string().email().optional(), refereePhone: z.string().max(40).optional(), refereeRelation: z.string().max(120).optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertAppOwner(ctx, input.applicationId);
      const token = randomUUID().replace(/-/g, '');
      await ctx.db.insert(referenceCheckRequests).values({ applicationId: input.applicationId, refereeName: input.refereeName, refereeEmail: input.refereeEmail, refereePhone: input.refereePhone, refereeRelation: input.refereeRelation, token, status: 'sent' });
      // Share this link with the referee: /reference/{token} (email template TBD).
      return { token };
    }),

  // ── Phase 9 public: referee submits ─────────────────────
  referenceByToken: publicProcedure.input(z.object({ token: z.string().max(64) })).query(async ({ ctx, input }) => {
    const r = await ctx.db.query.referenceCheckRequests.findFirst({ where: eq(referenceCheckRequests.token, input.token) });
    if (!r || r.status === 'completed') throw new TRPCError({ code: 'NOT_FOUND' });
    return { refereeName: r.refereeName };
  }),

  submitReference: publicProcedure
    .input(z.object({ token: z.string().max(64), answers: z.record(z.string(), z.string().max(2000)) }))
    .mutation(async ({ ctx, input }) => {
      const r = await ctx.db.query.referenceCheckRequests.findFirst({ where: eq(referenceCheckRequests.token, input.token) });
      if (!r || r.status === 'completed') throw new TRPCError({ code: 'BAD_REQUEST' });
      const TOOL = { name: 'ref_summary', description: 'Summarise a reference check.', input_schema: { type: 'object' as const, properties: { recommendation: { type: 'string', enum: ['Strong', 'Positive', 'Mixed', 'Concerning'] }, strengths: { type: 'array', items: { type: 'string' } }, redFlags: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, required: ['recommendation', 'strengths', 'redFlags', 'summary'] } };
      let aiSummary: string | null = null;
      try {
        const out = await structured<{ recommendation: string; strengths: string[]; redFlags: string[]; summary: string }>(
          'You analyse UAE job reference checks objectively. Call ref_summary.',
          wrapUserContent(Object.entries(input.answers).map(([k, v]) => `${k}: ${v}`).join('\n')),
          TOOL as never, { model: MODEL_SMART, maxTokens: 600 },
        );
        aiSummary = JSON.stringify(out);
      } catch { /* AI optional */ }
      await ctx.db.update(referenceCheckRequests).set({ answers: input.answers, aiSummary, status: 'completed', completedAt: new Date() }).where(eq(referenceCheckRequests.id, r.id));
      return { ok: true };
    }),

  referenceResults: employerProcedure.input(z.object({ applicationId: z.string().uuid() })).query(async ({ ctx, input }) => {
    await assertAppOwner(ctx, input.applicationId);
    return ctx.db.query.referenceCheckRequests.findMany({ where: eq(referenceCheckRequests.applicationId, input.applicationId), orderBy: [desc(referenceCheckRequests.createdAt)] });
  }),

  // ── Phase 8: compliance calculators (pure) ──────────────
  gratuity: employerProcedure
    .input(z.object({ monthlySalary: z.number().positive(), years: z.number().min(0).max(50), unlimited: z.boolean().default(true) }))
    .query(({ input }) => {
      const daily = input.monthlySalary / 30;
      // UAE: 21 days/yr for first 5 years, 30 days/yr after.
      const first = Math.min(input.years, 5) * 21 * daily;
      const rest = Math.max(0, input.years - 5) * 30 * daily;
      const total = Math.round(first + rest);
      const monthlyAccrual = Math.round((21 * daily) / 12);
      return { total, monthlyAccrual, trueMonthlyCost: Math.round(input.monthlySalary + monthlyAccrual) };
    }),

  emiratizationStats: employerProcedure
    .input(z.object({ headcount: z.number().int().min(0), emiratis: z.number().int().min(0), targetPct: z.number().min(0).max(100).default(2) }))
    .query(({ input }) => {
      const currentPct = input.headcount > 0 ? (input.emiratis / input.headcount) * 100 : 0;
      const required = Math.ceil((input.targetPct / 100) * input.headcount);
      const gap = Math.max(0, required - input.emiratis);
      const subsidyPerHirePerYear = 6000 * 12; // mid Nafis estimate
      return { currentPct: Math.round(currentPct * 10) / 10, targetPct: input.targetPct, required, gap, potentialSubsidy: gap * subsidyPerHirePerYear };
    }),
});
