import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { jobs, jobseekerProfiles, eq } from '@ddots/db';
import { formatSalary } from '@ddots/shared';
import { router, protectedProcedure, employerProcedure } from '../trpc';
import {
  chat,
  structured,
  MATCH_TOOL,
  CV_TOOL,
  MODEL_FAST,
  MODEL_SMART,
  type ChatMessage,
  type MatchResult,
  type CvResult,
} from '../lib/anthropic';
import { applications, sql } from '@ddots/db';

const messages = z
  .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) }))
  .max(40);

async function loadProfileText(db: any, userId: string): Promise<string> {
  const p = await db.query.jobseekerProfiles.findFirst({ where: eq(jobseekerProfiles.userId, userId) });
  if (!p) return 'No profile on file.';
  return [
    `Headline: ${p.headline ?? '—'}`,
    `Experience level: ${p.experienceLevel ?? '—'}`,
    `Category: ${p.categorySlug ?? '—'}`,
    `Emirate: ${p.emirateSlug ?? '—'}`,
    `Visa: ${p.visaStatus ?? '—'}`,
    `Skills: ${(p.skills ?? []).join(', ') || '—'}`,
    `Bio: ${p.bio ?? '—'}`,
  ].join('\n');
}

export const aiRouter = router({
  /** Match score: candidate profile vs a specific job (Sonnet). Caches result on the application. */
  matchScore: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }): Promise<MatchResult> => {
      const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId) });
      if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
      const profile = await loadProfileText(ctx.db, ctx.session.user.id);

      const result = await structured<MatchResult>(
        'You are an expert UAE recruiter. Score candidate-job fit honestly and concisely. Be specific about visa and location fit in the UAE context.',
        `JOB:\nTitle: ${job.title}\nLocation: ${job.emirateSlug}\nType: ${job.jobType}\nExperience: ${job.experienceLevel}\nSkills: ${(job.skills ?? []).join(', ')}\nDescription: ${job.description.slice(0, 2500)}\n\nCANDIDATE:\n${profile}`,
        MATCH_TOOL,
        { model: MODEL_SMART },
      );

      // Persist score on the application if one exists.
      await ctx.db
        .update(applications)
        .set({ matchScore: result.score })
        .where(sql`${applications.jobId} = ${input.jobId} AND ${applications.seekerId} = ${ctx.session.user.id}`);

      return result;
    }),

  /** CV / resume ATS analysis (Sonnet). Optionally tailored to a target role. */
  analyzeCv: protectedProcedure
    .input(z.object({ resumeText: z.string().min(50).max(20000), targetRole: z.string().max(160).optional() }))
    .mutation(async ({ input }): Promise<CvResult> =>
      structured<CvResult>(
        'You are an ATS (applicant tracking system) and senior recruiter for the UAE market. Analyze the CV for ATS readiness and give actionable, specific feedback.',
        `${input.targetRole ? `TARGET ROLE: ${input.targetRole}\n\n` : ''}CV:\n${input.resumeText}`,
        CV_TOOL,
        { model: MODEL_SMART, maxTokens: 1400 },
      ),
    ),

  /** Career advisor chat (Sonnet). */
  careerAdvisor: protectedProcedure
    .input(z.object({ messages }))
    .mutation(async ({ ctx, input }) => {
      const profile = await loadProfileText(ctx.db, ctx.session.user.id);
      const reply = await chat(
        `You are a friendly, practical career advisor for jobseekers in the UAE. Give concrete, localized advice (visa, emirates, salary norms in AED). Keep replies under 220 words. Candidate profile for context:\n${profile}`,
        input.messages as ChatMessage[],
        { model: MODEL_SMART },
      );
      return { reply };
    }),

  /** Interview preparation: tailored questions + tips (Sonnet). */
  interviewPrep: protectedProcedure
    .input(z.object({ role: z.string().min(2).max(160), jobId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      let jd = '';
      if (input.jobId) {
        const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId) });
        if (job) jd = `\n\nJOB DESCRIPTION:\n${job.description.slice(0, 2000)}`;
      }
      const reply = await chat(
        'You are an interview coach for the UAE market. Produce a focused prep pack in markdown: 6 likely questions with strong sample answers, 3 questions the candidate should ask, and 3 quick tips.',
        [{ role: 'user', content: `Role: ${input.role}${jd}` }],
        { model: MODEL_SMART, maxTokens: 1500 },
      );
      return { content: reply };
    }),

  /** Profile coach: review jobseeker profile and suggest improvements (Sonnet). */
  profileCoach: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await loadProfileText(ctx.db, ctx.session.user.id);
    const reply = await chat(
      'You are a profile coach. Review this UAE jobseeker profile and return markdown: an overall rating out of 10, the 3 biggest gaps, and a rewritten, punchy headline + 2-sentence bio they can copy.',
      [{ role: 'user', content: profile }],
      { model: MODEL_SMART },
    );
    return { content: reply };
  }),

  /** Salary coach: negotiation guidance (Sonnet). */
  salaryCoach: protectedProcedure
    .input(
      z.object({
        role: z.string().min(2).max(160),
        currentSalary: z.number().int().nonnegative().optional(),
        offer: z.number().int().nonnegative().optional(),
        emirate: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const reply = await chat(
        'You are a UAE salary negotiation coach. Give realistic AED monthly ranges and a short negotiation script. Markdown, under 250 words.',
        [
          {
            role: 'user',
            content: `Role: ${input.role}\nEmirate: ${input.emirate ?? 'UAE'}\nCurrent: ${input.currentSalary ? 'AED ' + input.currentSalary : 'n/a'}\nOffer: ${input.offer ? 'AED ' + input.offer : 'n/a'}`,
          },
        ],
        { model: MODEL_SMART },
      );
      return { content: reply };
    }),

  /** Employer HR chatbot — Haiku for short FAQs, Sonnet for complex policy questions. */
  hrChatbot: employerProcedure.input(z.object({ messages })).mutation(async ({ input }) => {
    const last = input.messages.at(-1)?.content ?? '';
    const complex = last.length > 200 || /polic|legal|gratuity|terminat|labou?r law|visa cancel/i.test(last);
    const reply = await chat(
      'You are an HR assistant for UAE employers. Answer questions about hiring, UAE labour law basics, and using DdotsMediaJobs. Be concise and flag when professional/legal advice is needed.',
      input.messages as ChatMessage[],
      { model: complex ? MODEL_SMART : MODEL_FAST, maxTokens: 800 },
    );
    return { reply, model: complex ? 'sonnet' : 'haiku' };
  }),

  /** Cover letter generator (Haiku). */
  coverLetter: protectedProcedure
    .input(z.object({ jobId: z.string().uuid(), tone: z.enum(['professional', 'casual', 'enthusiastic']).default('professional') }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId) });
      if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
      const profile = await loadProfileText(ctx.db, ctx.session.user.id);
      const reply = await chat(
        `You are a UAE job-application writer. Write a concise 3-paragraph cover letter in a ${input.tone} tone. No placeholders — use the candidate details given. Return only the letter body.`,
        [{ role: 'user', content: `JOB: ${job.title}\n${job.description.slice(0, 1500)}\n\nCANDIDATE:\n${profile}\n\nName: ${ctx.session.user.name ?? ''}` }],
        { model: MODEL_FAST, maxTokens: 700 },
      );
      return { coverLetter: reply };
    }),

  /** Social media post generator for a job (Haiku, employer). */
  socialPosts: employerProcedure.input(z.object({ jobId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId), with: { company: { columns: { name: true } } } });
    if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
    const result = await structured<{ linkedin: string; instagram: string; whatsapp: string; twitter: string }>(
      'You write platform-optimized social posts to advertise UAE jobs. Keep each within platform norms and include relevant hashtags and the apply link placeholder {url}.',
      `Job: ${job.title} at ${job.company?.name ?? 'our company'}, ${job.emirateSlug}, ${formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden)}.`,
      {
        name: 'social_posts',
        description: 'Platform-specific job promotion posts.',
        input_schema: {
          type: 'object',
          properties: {
            linkedin: { type: 'string' }, instagram: { type: 'string' }, whatsapp: { type: 'string' }, twitter: { type: 'string' },
          },
          required: ['linkedin', 'instagram', 'whatsapp', 'twitter'],
        },
      },
      { model: MODEL_FAST, maxTokens: 900 },
    );
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.slug}`;
    return {
      linkedin: result.linkedin.replaceAll('{url}', url),
      instagram: result.instagram.replaceAll('{url}', url),
      whatsapp: result.whatsapp.replaceAll('{url}', url),
      twitter: result.twitter.replaceAll('{url}', url),
    };
  }),

  /** Skill gap analyzer for a job vs the seeker (Sonnet). */
  skillGap: protectedProcedure.input(z.object({ jobId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId) });
    if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
    const profile = await ctx.db.query.jobseekerProfiles.findFirst({ where: eq(jobseekerProfiles.userId, ctx.session.user.id) });
    return structured<{ matched: string[]; missing: { skill: string; importance: 'critical' | 'nice-to-have'; resource: string }[] }>(
      'You analyze a UAE candidate vs a job. List matched skills and missing skills, each with importance and a concrete free learning resource.',
      `JOB skills: ${(job.skills ?? []).join(', ')}\nJOB: ${job.title} — ${job.description.slice(0, 1200)}\nCANDIDATE skills: ${(profile?.skills ?? []).join(', ') || 'none listed'}`,
      {
        name: 'skill_gap',
        description: 'Matched and missing skills with learning resources.',
        input_schema: {
          type: 'object',
          properties: {
            matched: { type: 'array', items: { type: 'string' } },
            missing: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skill: { type: 'string' },
                  importance: { type: 'string', enum: ['critical', 'nice-to-have'] },
                  resource: { type: 'string' },
                },
                required: ['skill', 'importance', 'resource'],
              },
            },
          },
          required: ['matched', 'missing'],
        },
      },
      { model: MODEL_SMART, maxTokens: 1000 },
    );
  }),

  /** Rank all candidates for a job (Sonnet, employer). Persists score + summary. */
  rankCandidates: employerProcedure.input(z.object({ jobId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId) });
    if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
    if (job.employerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });

    const apps = await ctx.db.query.applications.findMany({
      where: eq(applications.jobId, input.jobId),
      with: { seeker: { columns: { name: true } } },
      limit: 30,
    });
    if (apps.length === 0) return { ranked: [] };

    const candidates = apps.map((a, i) => `#${i} ${a.seeker?.name ?? a.guestName ?? 'Candidate'}: ${a.coverLetter?.slice(0, 400) ?? 'no cover letter'}`).join('\n');
    const result = await structured<{ ranked: { index: number; score: number; summary: string }[] }>(
      'You are a UAE recruiter ranking candidates for a job. Score each 0-100 and give a one-line summary. Return them ordered best-first by index.',
      `JOB: ${job.title}\n${job.description.slice(0, 1500)}\n\nCANDIDATES:\n${candidates}`,
      {
        name: 'rank',
        description: 'Ranked candidate scores.',
        input_schema: {
          type: 'object',
          properties: {
            ranked: {
              type: 'array',
              items: {
                type: 'object',
                properties: { index: { type: 'integer' }, score: { type: 'integer' }, summary: { type: 'string' } },
                required: ['index', 'score', 'summary'],
              },
            },
          },
          required: ['ranked'],
        },
      },
      { model: MODEL_SMART, maxTokens: 1500 },
    );

    // Persist scores back to the applications.
    for (const r of result.ranked) {
      const app = apps[r.index];
      if (app) {
        await ctx.db.update(applications).set({ matchScore: r.score, aiSummary: r.summary }).where(eq(applications.id, app.id));
      }
    }
    return {
      ranked: result.ranked
        .map((r) => ({ ...r, name: apps[r.index]?.seeker?.name ?? apps[r.index]?.guestName ?? 'Candidate' }))
        .sort((a, b) => b.score - a.score),
    };
  }),
});
