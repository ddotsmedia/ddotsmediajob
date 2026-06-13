import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  whatsappGroups,
  groupJobBlasts,
  volunteerStats,
  jobs,
  users,
  referralCodes,
  referrals,
  communityQa,
  communityQaAnswers,
  salaryPolls,
  salaryPollResponses,
  mentorProfiles,
  mentorRequests,
  communityEvents,
  communityEventRsvps,
  groupSuccessStories,
  scamReports,
  eq,
  and,
  desc,
  sql,
  gte,
  count,
} from '@ddots/db';
import { slugify, formatSalary, emirateBySlug } from '@ddots/shared';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc';
import { structured, MODEL_FAST } from '../lib/anthropic';
import { wrapUserContent } from '../lib/security';
import { notify } from '../lib/helpers';

function groupSlug(g: { slug: string | null; name: string }) {
  return g.slug ?? slugify(g.name);
}

export const communityHubRouter = router({
  // ── Phase 1: group directory ────────────────────────────
  getGroups: publicProcedure.input(z.object({ category: z.string().optional(), q: z.string().max(80).optional() }).optional()).query(async ({ ctx, input }) => {
    const conds = [eq(whatsappGroups.isActive, true)];
    if (input?.category) conds.push(eq(whatsappGroups.categorySlug, input.category));
    const rows = await ctx.db.query.whatsappGroups.findMany({ where: and(...conds), orderBy: [desc(whatsappGroups.memberCount)], limit: 200 });
    const filtered = input?.q ? rows.filter((r) => r.name.toLowerCase().includes(input.q!.toLowerCase())) : rows;
    return filtered.map((g) => ({ ...g, slug: groupSlug(g) }));
  }),

  getGroup: publicProcedure.input(z.object({ slug: z.string().max(120) })).query(async ({ ctx, input }) => {
    let group = await ctx.db.query.whatsappGroups.findFirst({ where: eq(whatsappGroups.slug, input.slug) });
    if (!group) {
      const all = await ctx.db.query.whatsappGroups.findMany({ where: eq(whatsappGroups.isActive, true), limit: 300 });
      group = all.find((g) => groupSlug(g) === input.slug);
    }
    if (!group) throw new TRPCError({ code: 'NOT_FOUND' });
    const recentBlasts = await ctx.db
      .select({ jobId: groupJobBlasts.jobId, sentAt: groupJobBlasts.sentAt, title: jobs.title, slug: jobs.slug, salaryMin: jobs.salaryMin, salaryMax: jobs.salaryMax, salaryPeriod: jobs.salaryPeriod, salaryHidden: jobs.salaryHidden })
      .from(groupJobBlasts)
      .leftJoin(jobs, eq(jobs.id, groupJobBlasts.jobId))
      .where(eq(groupJobBlasts.groupId, group.id))
      .orderBy(desc(groupJobBlasts.sentAt))
      .limit(10);
    return { group: { ...group, slug: groupSlug(group) }, recentBlasts };
  }),

  /** Latest jobs in the group's category (the live "feed" when no blasts logged). */
  groupJobFeed: publicProcedure.input(z.object({ slug: z.string().max(120) })).query(async ({ ctx, input }) => {
    const all = await ctx.db.query.whatsappGroups.findMany({ where: eq(whatsappGroups.isActive, true), limit: 300 });
    const group = all.find((g) => groupSlug(g) === input.slug || g.slug === input.slug);
    if (!group?.categorySlug) return [];
    return ctx.db.query.jobs.findMany({ where: and(eq(jobs.status, 'active'), eq(jobs.categorySlug, group.categorySlug)), orderBy: [desc(jobs.publishedAt)], limit: 10, with: { company: { columns: { name: true } } } });
  }),

  /** Group leaderboards: most jobs shared, most hires, most members. */
  groupLeaderboard: publicProcedure.query(async ({ ctx }) => {
    const top = async (col: typeof whatsappGroups.jobsSharedCount) =>
      (await ctx.db.query.whatsappGroups.findMany({ where: eq(whatsappGroups.isActive, true), orderBy: [desc(col)], limit: 10 })).map((g) => ({ id: g.id, name: g.name, slug: groupSlug(g), jobsShared: g.jobsSharedCount, hires: g.hiresCount, members: g.memberCount }));
    const [mostJobs, mostHires, mostMembers] = await Promise.all([top(whatsappGroups.jobsSharedCount), top(whatsappGroups.hiresCount), top(whatsappGroups.memberCount)]);
    return { mostJobs, mostHires, mostMembers };
  }),

  directoryStats: publicProcedure.query(async ({ ctx }) => {
    const [g, blastWeek] = await Promise.all([
      ctx.db.select({ groups: count(), members: sql<number>`coalesce(sum(${whatsappGroups.memberCount}),0)::int` }).from(whatsappGroups).where(eq(whatsappGroups.isActive, true)),
      ctx.db.select({ n: count() }).from(groupJobBlasts).where(gte(groupJobBlasts.sentAt, sql`now() - interval '7 days'`)),
    ]);
    return { groups: Number(g[0]?.groups ?? 0), members: Number(g[0]?.members ?? 0), jobsThisWeek: Number(blastWeek[0]?.n ?? 0) };
  }),

  /** Volunteer/admin logs a blast. Rate limit: 1 per job per group per 24h. */
  logBlast: protectedProcedure
    .input(z.object({ groupId: z.string().uuid(), jobId: z.string().uuid(), message: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const recent = await ctx.db.select({ n: count() }).from(groupJobBlasts).where(and(eq(groupJobBlasts.groupId, input.groupId), eq(groupJobBlasts.jobId, input.jobId), gte(groupJobBlasts.sentAt, sql`now() - interval '24 hours'`)));
      if (Number(recent[0]?.n ?? 0) > 0) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'This job was already blasted to this group in the last 24h.' });
      await ctx.db.insert(groupJobBlasts).values({ groupId: input.groupId, jobId: input.jobId, blasterId: ctx.session.user.id, message: input.message });
      await ctx.db.update(whatsappGroups).set({ jobsSharedCount: sql`${whatsappGroups.jobsSharedCount} + 1`, lastBlastedAt: new Date() }).where(eq(whatsappGroups.id, input.groupId));
      // Volunteer points: +10 per blast (event-log row).
      await ctx.db.insert(volunteerStats).values({ userId: ctx.session.user.id, groupId: input.groupId, month: sql`date_trunc('month', now())` as never, jobsShared: 1, points: 10 });
      return { ok: true };
    }),

  /** Build a ready-to-paste WhatsApp blast message for a job + group. */
  generateBlastMessage: protectedProcedure
    .input(z.object({ jobId: z.string().uuid(), groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [job, group] = await Promise.all([
        ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId), with: { company: { columns: { name: true } } } }),
        ctx.db.query.whatsappGroups.findFirst({ where: eq(whatsappGroups.id, input.groupId) }),
      ]);
      if (!job || !group) throw new TRPCError({ code: 'NOT_FOUND' });
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ddotsmediajobs.com';
      const pay = formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden);
      const em = emirateBySlug(job.emirateSlug)?.name ?? job.emirateSlug;
      const lines = [
        `🚨 *New Job Alert* | ${group.name}`,
        `📋 ${job.title}`,
        job.company?.name ? `🏢 ${job.company.name}` : '',
        `📍 ${em}`,
        `💰 ${pay}`,
        job.visaProvided ? '✅ Visa provided' : '',
        `📲 Apply free: ${site}/jobs/${job.slug}`,
        `👥 Shared by DdotsMediaJobs`,
      ].filter(Boolean);
      return { message: lines.join('\n') };
    }),

  /** Current volunteer's stats + rank. */
  myVolunteerStats: protectedProcedure.query(async ({ ctx }) => {
    const mine = await ctx.db.select({ points: sql<number>`coalesce(sum(${volunteerStats.points}),0)::int`, jobsShared: sql<number>`coalesce(sum(${volunteerStats.jobsShared}),0)::int` }).from(volunteerStats).where(eq(volunteerStats.userId, ctx.session.user.id));
    const monthPoints = await ctx.db.select({ points: sql<number>`coalesce(sum(${volunteerStats.points}),0)::int` }).from(volunteerStats).where(and(eq(volunteerStats.userId, ctx.session.user.id), gte(volunteerStats.month, sql`date_trunc('month', now())` as never)));
    return { totalPoints: Number(mine[0]?.points ?? 0), jobsShared: Number(mine[0]?.jobsShared ?? 0), monthPoints: Number(monthPoints[0]?.points ?? 0) };
  }),

  /** Top volunteers by points (this month). */
  volunteerLeaderboard: publicProcedure.input(z.object({ period: z.enum(['month', 'all']).default('month') }).optional()).query(async ({ ctx, input }) => {
    const period = input?.period ?? 'month';
    const where = period === 'month' ? gte(volunteerStats.month, sql`date_trunc('month', now())` as never) : undefined;
    const q = ctx.db.select({ userId: volunteerStats.userId, name: users.name, points: sql<number>`sum(${volunteerStats.points})::int`, jobsShared: sql<number>`sum(${volunteerStats.jobsShared})::int` }).from(volunteerStats).leftJoin(users, eq(users.id, volunteerStats.userId)).groupBy(volunteerStats.userId, users.name).orderBy(desc(sql`sum(${volunteerStats.points})`)).limit(10);
    return where ? q.where(where) : q;
  }),

  /** My assigned groups (volunteer). */
  myGroups: protectedProcedure.query(({ ctx }) =>
    ctx.db.query.whatsappGroups.findMany({ where: eq(whatsappGroups.volunteerId, ctx.session.user.id), orderBy: [desc(whatsappGroups.memberCount)] }),
  ),

  // ── Admin: volunteer management ─────────────────────────
  adminListVolunteers: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: whatsappGroups.id, name: whatsappGroups.name, volunteerId: whatsappGroups.volunteerId, volunteerName: users.name, jobsShared: whatsappGroups.jobsSharedCount })
      .from(whatsappGroups)
      .leftJoin(users, eq(users.id, whatsappGroups.volunteerId))
      .where(eq(whatsappGroups.isActive, true))
      .orderBy(desc(whatsappGroups.memberCount));
    return rows;
  }),

  adminAssignVolunteer: adminProcedure.input(z.object({ groupId: z.string().uuid(), userId: z.string().uuid().nullable() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(whatsappGroups).set({ volunteerId: input.userId }).where(eq(whatsappGroups.id, input.groupId));
    if (input.userId) await ctx.db.update(users).set({ role: 'volunteer' }).where(and(eq(users.id, input.userId), eq(users.role, 'jobseeker')));
    return { ok: true };
  }),

  // ── Phase 3: referrals ──────────────────────────────────
  myReferralCode: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.db.query.referralCodes.findFirst({ where: eq(referralCodes.userId, ctx.session.user.id) });
    if (existing) return existing;
    const code = `DDJ-${randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}`;
    const [row] = await ctx.db.insert(referralCodes).values({ userId: ctx.session.user.id, code }).onConflictDoNothing().returning();
    return row ?? (await ctx.db.query.referralCodes.findFirst({ where: eq(referralCodes.userId, ctx.session.user.id) }));
  }),

  referralStats: protectedProcedure.query(async ({ ctx }) => {
    const code = await ctx.db.query.referralCodes.findFirst({ where: eq(referralCodes.userId, ctx.session.user.id) });
    const convs = await ctx.db.select({ n: count() }).from(referrals).where(and(eq(referrals.referrerId, ctx.session.user.id), eq(referrals.converted, true)));
    return { code: code?.code ?? null, clicks: code?.totalClicks ?? 0, conversions: Number(convs[0]?.n ?? 0) };
  }),

  trackReferralClick: publicProcedure.input(z.object({ code: z.string().max(20) })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(referralCodes).set({ totalClicks: sql`${referralCodes.totalClicks} + 1` }).where(eq(referralCodes.code, input.code));
    const owner = await ctx.db.query.referralCodes.findFirst({ where: eq(referralCodes.code, input.code) });
    return { valid: !!owner };
  }),

  referralLeaderboard: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select({ code: referralCodes.code, clicks: referralCodes.totalClicks, conversions: referralCodes.totalConversions }).from(referralCodes).orderBy(desc(referralCodes.totalConversions)).limit(10);
    return rows;
  }),

  // ── Phase 5: Q&A ────────────────────────────────────────
  createQuestion: protectedProcedure
    .input(z.object({ categorySlug: z.string().max(40).optional(), question: z.string().min(20).max(300), isAnonymous: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      // Strip phone numbers / emails from public posts.
      const clean = input.question.replace(/\+?\d[\d\s-]{7,}\d/g, '[removed]').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[removed]');
      const slug = `${slugify(clean).slice(0, 60)}-${randomBytes(3).toString('hex')}`;
      const [row] = await ctx.db.insert(communityQa).values({ slug, categorySlug: input.categorySlug, userId: ctx.session.user.id, question: clean, isAnonymous: input.isAnonymous }).returning();
      return row;
    }),

  getQuestions: publicProcedure
    .input(z.object({ category: z.string().optional(), filter: z.enum(['all', 'unanswered', 'top', 'recent']).default('recent') }).optional())
    .query(async ({ ctx, input }) => {
      const conds = [eq(communityQa.isApproved, true)];
      if (input?.category) conds.push(eq(communityQa.categorySlug, input.category));
      if (input?.filter === 'unanswered') conds.push(eq(communityQa.isAnswered, false));
      const order = input?.filter === 'top' ? [desc(communityQa.upvotes)] : [desc(communityQa.createdAt)];
      return ctx.db.query.communityQa.findMany({ where: and(...conds), orderBy: order, limit: 50 });
    }),

  getQuestion: publicProcedure.input(z.object({ slug: z.string().max(200) })).query(async ({ ctx, input }) => {
    const q = await ctx.db.query.communityQa.findFirst({ where: eq(communityQa.slug, input.slug) });
    if (!q) throw new TRPCError({ code: 'NOT_FOUND' });
    const answers = await ctx.db.query.communityQaAnswers.findMany({ where: eq(communityQaAnswers.questionId, q.id), orderBy: [desc(communityQaAnswers.upvotes)] });
    return { question: q, answers };
  }),

  answerQuestion: protectedProcedure.input(z.object({ questionId: z.string().uuid(), answer: z.string().min(2).max(3000) })).mutation(async ({ ctx, input }) => {
    const clean = input.answer.replace(/\+?\d[\d\s-]{7,}\d/g, '[removed]').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[removed]');
    const [row] = await ctx.db.insert(communityQaAnswers).values({ questionId: input.questionId, userId: ctx.session.user.id, answer: clean }).returning();
    await ctx.db.update(communityQa).set({ answerCount: sql`${communityQa.answerCount} + 1`, isAnswered: true }).where(eq(communityQa.id, input.questionId));
    return row;
  }),

  upvoteQuestion: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(communityQa).set({ upvotes: sql`${communityQa.upvotes} + 1` }).where(eq(communityQa.id, input.id));
    return { ok: true };
  }),

  upvoteAnswer: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(communityQaAnswers).set({ upvotes: sql`${communityQaAnswers.upvotes} + 1` }).where(eq(communityQaAnswers.id, input.id));
    return { ok: true };
  }),

  // ── Phase 11: anti-scam job checker ─────────────────────
  checkJobScam: publicProcedure.input(z.object({ text: z.string().min(15).max(4000) })).mutation(async ({ input }) => {
    const TOOL = {
      name: 'scam_check',
      description: 'Assess UAE job-posting scam risk.',
      input_schema: {
        type: 'object' as const,
        properties: {
          risk: { type: 'string', enum: ['safe', 'caution', 'scam'] },
          score: { type: 'integer', description: '0 (safe) - 100 (definite scam)' },
          flags: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
        },
        required: ['risk', 'score', 'flags', 'recommendation'],
      },
    };
    // Note: pasted text is never stored unless the user explicitly reports it.
    return structured<{ risk: string; score: number; flags: string[]; recommendation: string }>(
      'You detect UAE job scams. Flag upfront fees, missing company, personal/overseas numbers, unrealistic salary, requests for passport/bank details, urgency pressure, poor grammar. Reward verifiable company, realistic salary, +971 numbers, official domains. Call scam_check.',
      wrapUserContent(input.text),
      TOOL as never,
      { model: MODEL_FAST, maxTokens: 600 },
    );
  }),

  reportScam: publicProcedure.input(z.object({ text: z.string().max(4000), source: z.string().max(60).optional(), riskScore: z.number().int().optional(), flags: z.array(z.string()).optional() })).mutation(async ({ ctx, input }) => {
    await ctx.db.insert(scamReports).values({ text: input.text.slice(0, 4000), source: input.source, riskScore: input.riskScore, flags: input.flags ?? [], reporterId: ctx.session?.user?.id ?? null });
    return { ok: true };
  }),

  // ── Phase 6: salary polls ───────────────────────────────
  createPoll: adminProcedure
    .input(z.object({ question: z.string().min(5).max(300), options: z.array(z.string().min(1).max(120)).min(2).max(6), categorySlug: z.string().max(40).optional(), emirate: z.string().max(40).optional(), durationDays: z.number().int().min(1).max(60).default(7) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(salaryPolls).values({
        question: input.question, options: input.options, categorySlug: input.categorySlug, emirate: input.emirate,
        startsAt: new Date(), endsAt: new Date(Date.now() + input.durationDays * 86_400_000), publishedAt: new Date(),
      }).returning();
      return row;
    }),

  adminListPolls: adminProcedure.query(({ ctx }) => ctx.db.query.salaryPolls.findMany({ orderBy: [desc(salaryPolls.createdAt)], limit: 100 })),

  /** Latest active poll for a category/emirate (with results + whether I voted). */
  activePoll: publicProcedure.input(z.object({ category: z.string().optional(), emirate: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const conds = [sql`${salaryPolls.publishedAt} is not null`, sql`(${salaryPolls.endsAt} is null or ${salaryPolls.endsAt} > now())`];
    if (input?.category) conds.push(eq(salaryPolls.categorySlug, input.category));
    if (input?.emirate) conds.push(eq(salaryPolls.emirate, input.emirate));
    const poll = await ctx.db.query.salaryPolls.findFirst({ where: and(...conds), orderBy: [desc(salaryPolls.createdAt)] });
    if (!poll) return null;
    const counts = await ctx.db.select({ option: salaryPollResponses.selectedOption, n: count() }).from(salaryPollResponses).where(eq(salaryPollResponses.pollId, poll.id)).groupBy(salaryPollResponses.selectedOption);
    const map = new Map(counts.map((c) => [c.option, Number(c.n)]));
    const total = counts.reduce((s, c) => s + Number(c.n), 0);
    let voted = false;
    if (ctx.session?.user?.id) voted = !!(await ctx.db.query.salaryPollResponses.findFirst({ where: and(eq(salaryPollResponses.pollId, poll.id), eq(salaryPollResponses.userId, ctx.session.user.id)) }));
    return { poll, results: poll.options.map((o) => ({ option: o, votes: map.get(o) ?? 0 })), total, voted };
  }),

  votePoll: protectedProcedure.input(z.object({ pollId: z.string().uuid(), option: z.string().max(120) })).mutation(async ({ ctx, input }) => {
    await ctx.db.insert(salaryPollResponses).values({ pollId: input.pollId, userId: ctx.session.user.id, selectedOption: input.option }).onConflictDoNothing();
    return { ok: true };
  }),

  // ── Phase 7: mentor matching ────────────────────────────
  applyMentor: protectedProcedure
    .input(z.object({ bio: z.string().max(2000), professions: z.array(z.string().max(60)).max(10), emirates: z.array(z.string().max(40)).max(7), topics: z.array(z.string().max(60)).max(10), availableDays: z.array(z.string().max(20)).max(7).optional(), maxMenteesPerMonth: z.number().int().min(1).max(20).default(3) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(mentorProfiles).values({ userId: ctx.session.user.id, ...input, availableDays: input.availableDays ?? [], availableTimes: [] }).onConflictDoUpdate({ target: mentorProfiles.userId, set: { bio: input.bio, professions: input.professions, emirates: input.emirates, topics: input.topics, availableDays: input.availableDays ?? [], maxMenteesPerMonth: input.maxMenteesPerMonth } });
      return { ok: true };
    }),

  getMentors: publicProcedure.input(z.object({ profession: z.string().optional(), topic: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select({ id: mentorProfiles.id, userId: mentorProfiles.userId, bio: mentorProfiles.bio, professions: mentorProfiles.professions, topics: mentorProfiles.topics, emirates: mentorProfiles.emirates, totalSessions: mentorProfiles.totalSessions, ratingAvg: mentorProfiles.ratingAvg, name: users.name, image: users.image })
      .from(mentorProfiles)
      .leftJoin(users, eq(users.id, mentorProfiles.userId))
      .where(and(eq(mentorProfiles.isApproved, true), eq(mentorProfiles.isActive, true)))
      .orderBy(desc(mentorProfiles.totalSessions))
      .limit(60);
    return rows.filter((m) => (!input?.profession || m.professions.includes(input.profession)) && (!input?.topic || m.topics.includes(input.topic)));
  }),

  requestMentorSession: protectedProcedure
    .input(z.object({ mentorId: z.string().uuid(), topic: z.string().max(120), message: z.string().max(2000), preferredTime: z.string().max(120).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(mentorRequests).values({ menteeId: ctx.session.user.id, mentorId: input.mentorId, topic: input.topic, message: input.message, preferredTime: input.preferredTime }).returning();
      await notify(input.mentorId, 'mentor-request', 'New mentorship request', { body: input.topic, link: '/dashboard/mentorship' });
      return row;
    }),

  myMentorRequests: protectedProcedure.query(({ ctx }) =>
    ctx.db.query.mentorRequests.findMany({ where: eq(mentorRequests.mentorId, ctx.session.user.id), orderBy: [desc(mentorRequests.createdAt)], limit: 100 }),
  ),

  respondMentorRequest: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(['accepted', 'declined', 'completed']), zoomLink: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.db.query.mentorRequests.findFirst({ where: eq(mentorRequests.id, input.id) });
      if (!req || req.mentorId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      await ctx.db.update(mentorRequests).set({ status: input.status, zoomLink: input.zoomLink }).where(eq(mentorRequests.id, input.id));
      if (input.status === 'completed') await ctx.db.update(mentorProfiles).set({ totalSessions: sql`${mentorProfiles.totalSessions} + 1` }).where(eq(mentorProfiles.userId, ctx.session.user.id));
      await notify(req.menteeId, 'mentor-response', `Mentorship request ${input.status}`, { body: input.zoomLink ? 'A meeting link was added.' : undefined, link: '/dashboard/mentorship' });
      return { ok: true };
    }),

  rateMentor: protectedProcedure.input(z.object({ id: z.string().uuid(), rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
    const req = await ctx.db.query.mentorRequests.findFirst({ where: eq(mentorRequests.id, input.id) });
    if (!req || req.menteeId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
    await ctx.db.update(mentorRequests).set({ rating: input.rating, ratingComment: input.comment }).where(eq(mentorRequests.id, input.id));
    return { ok: true };
  }),

  // ── Phase 8: community events ───────────────────────────
  createEvent: protectedProcedure
    .input(z.object({ title: z.string().min(3).max(200), description: z.string().max(5000).optional(), eventType: z.string().max(40).optional(), categorySlug: z.string().max(40).optional(), zoomLink: z.string().max(500).optional(), scheduledAt: z.string(), durationMinutes: z.number().int().min(15).max(480).default(60), maxAttendees: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!['admin', 'volunteer'].includes(ctx.session.user.role)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admins and volunteers only.' });
      const slug = `${slugify(input.title).slice(0, 60)}-${randomBytes(3).toString('hex')}`;
      const [row] = await ctx.db.insert(communityEvents).values({ slug, title: input.title, description: input.description, eventType: input.eventType, categorySlug: input.categorySlug, zoomLink: input.zoomLink, scheduledAt: new Date(input.scheduledAt), durationMinutes: input.durationMinutes, maxAttendees: input.maxAttendees ?? null, hostId: ctx.session.user.id, status: 'upcoming' }).returning();
      return row;
    }),

  listEvents: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.communityEvents.findMany({ orderBy: [desc(communityEvents.scheduledAt)], limit: 100 });
    const now = Date.now();
    return {
      upcoming: rows.filter((e) => e.status !== 'completed' && e.status !== 'cancelled' && (!e.scheduledAt || new Date(e.scheduledAt).getTime() >= now)),
      past: rows.filter((e) => e.status === 'completed' || (e.scheduledAt && new Date(e.scheduledAt).getTime() < now)),
    };
  }),

  eventBySlug: publicProcedure.input(z.object({ slug: z.string().max(200) })).query(async ({ ctx, input }) => {
    const event = await ctx.db.query.communityEvents.findFirst({ where: eq(communityEvents.slug, input.slug) });
    if (!event) throw new TRPCError({ code: 'NOT_FOUND' });
    const rsvpRow = await ctx.db.select({ n: count() }).from(communityEventRsvps).where(eq(communityEventRsvps.eventId, event.id));
    let hasRsvp = false;
    if (ctx.session?.user?.id) hasRsvp = !!(await ctx.db.query.communityEventRsvps.findFirst({ where: and(eq(communityEventRsvps.eventId, event.id), eq(communityEventRsvps.userId, ctx.session.user.id)) }));
    // Reveal the meeting link only after RSVP.
    return { event: { ...event, zoomLink: hasRsvp ? event.zoomLink : null }, rsvpCount: Number(rsvpRow[0]?.n ?? 0), hasRsvp };
  }),

  rsvpEvent: protectedProcedure.input(z.object({ eventId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.insert(communityEventRsvps).values({ eventId: input.eventId, userId: ctx.session.user.id }).onConflictDoNothing();
    return { ok: true };
  }),

  // ── Phase 9: community success stories ──────────────────
  submitStory: protectedProcedure
    .input(z.object({ title: z.string().min(5).max(200), story: z.string().min(100).max(4000), jobTitle: z.string().max(160).optional(), company: z.string().max(160).optional(), emirate: z.string().max(40).optional(), groupId: z.string().uuid().optional(), weeksToHire: z.number().int().min(0).max(520).optional(), tips: z.string().max(2000).optional(), photo: z.string().url().optional() }))
    .mutation(async ({ ctx, input }) => {
      const slug = `${slugify(input.title).slice(0, 60)}-${randomBytes(3).toString('hex')}`;
      const [row] = await ctx.db.insert(groupSuccessStories).values({ slug, userId: ctx.session.user.id, ...input, approved: false }).returning();
      return row;
    }),

  listStories: publicProcedure.input(z.object({ groupId: z.string().uuid().optional(), featured: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => {
    const conds = [eq(groupSuccessStories.approved, true)];
    if (input?.groupId) conds.push(eq(groupSuccessStories.groupId, input.groupId));
    if (input?.featured) conds.push(eq(groupSuccessStories.featured, true));
    return ctx.db.query.groupSuccessStories.findMany({ where: and(...conds), orderBy: [desc(groupSuccessStories.createdAt)], limit: 30 });
  }),

  adminPendingStories: adminProcedure.query(({ ctx }) => ctx.db.query.groupSuccessStories.findMany({ where: eq(groupSuccessStories.approved, false), orderBy: [desc(groupSuccessStories.createdAt)], limit: 100 })),

  adminDecideStory: adminProcedure.input(z.object({ id: z.string().uuid(), approved: z.boolean(), featured: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(groupSuccessStories).set({ approved: input.approved, featured: input.featured ?? false }).where(eq(groupSuccessStories.id, input.id));
    return { ok: true };
  }),
});
