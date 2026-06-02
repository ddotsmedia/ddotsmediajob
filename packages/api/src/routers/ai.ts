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
});
