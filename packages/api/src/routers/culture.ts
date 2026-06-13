import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { cultureProfiles, employerProfiles, jobs, eq, and } from '@ddots/db';
import { router, protectedProcedure } from '../trpc';
import { structured, MODEL_FAST } from '../lib/anthropic';

const SEEKER_TOOL: Anthropic.Tool = {
  name: 'culture_profile',
  description: 'Summarise a jobseeker work-style / culture profile from their assessment answers.',
  input_schema: {
    type: 'object',
    properties: {
      workStyle: { type: 'string', description: '~200 word summary of how this person works best' },
      bestFitCultures: { type: 'array', items: { type: 'string' }, description: 'Up to 4 company-culture types that fit' },
      bestFitIndustries: { type: 'array', items: { type: 'string' }, description: 'Up to 4 industries that fit' },
      communicationStyle: { type: 'string' },
      redFlags: { type: 'array', items: { type: 'string' }, description: '3 culture mismatches to avoid' },
    },
    required: ['workStyle', 'bestFitCultures', 'bestFitIndustries', 'communicationStyle', 'redFlags'],
  },
};

const EMPLOYER_TOOL: Anthropic.Tool = {
  name: 'employer_culture',
  description: 'Summarise an employer culture from their questionnaire answers.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '~150 word culture summary' },
      values: { type: 'array', items: { type: 'string' }, description: 'Up to 5 core values' },
      idealCandidate: { type: 'string', description: 'Who thrives here' },
    },
    required: ['summary', 'values', 'idealCandidate'],
  },
};

const MATCH_TOOL: Anthropic.Tool = {
  name: 'culture_match',
  description: 'Score culture fit between a candidate and an employer 0-100 with reasons.',
  input_schema: {
    type: 'object',
    properties: {
      score: { type: 'integer', description: '0 (poor fit) - 100 (excellent fit)' },
      reasons: { type: 'array', items: { type: 'string' }, description: 'Up to 3 short reasons' },
    },
    required: ['score', 'reasons'],
  },
};

function answersToText(answers: Record<string, string>): string {
  return Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n');
}

export const cultureRouter = router({
  /** Current user's saved culture profile (or null). */
  mine: protectedProcedure.query(({ ctx }) =>
    ctx.db.query.cultureProfiles.findFirst({ where: eq(cultureProfiles.userId, ctx.session.user.id) }),
  ),

  /** Run the assessment: AI summary (Haiku) + store. */
  saveAssessment: protectedProcedure
    .input(z.object({ userType: z.enum(['seeker', 'employer']), answers: z.record(z.string(), z.string().max(200)) }))
    .mutation(async ({ ctx, input }) => {
      const tool = input.userType === 'seeker' ? SEEKER_TOOL : EMPLOYER_TOOL;
      const aiSummary = await structured<Record<string, unknown>>(
        'You are a UAE workplace-culture analyst. Use only the answers provided. Be concise and practical.',
        `<user_content>\n${answersToText(input.answers)}\n</user_content>`,
        tool,
        { model: MODEL_FAST, maxTokens: 700 },
      );
      await ctx.db
        .insert(cultureProfiles)
        .values({ userId: ctx.session.user.id, userType: input.userType, answers: input.answers, aiSummary })
        .onConflictDoUpdate({ target: cultureProfiles.userId, set: { userType: input.userType, answers: input.answers, aiSummary, updatedAt: new Date() } });
      if (input.userType === 'employer') {
        await ctx.db.update(employerProfiles).set({ cultureProfileAi: aiSummary }).where(eq(employerProfiles.userId, ctx.session.user.id));
      }
      return aiSummary;
    }),

  /** Culture match between current seeker and a job's employer. Null if either side has no profile. */
  match: protectedProcedure.input(z.object({ jobId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId), columns: { employerId: true } });
    if (!job) return null;
    const [seeker, employer] = await Promise.all([
      ctx.db.query.cultureProfiles.findFirst({ where: and(eq(cultureProfiles.userId, ctx.session.user.id), eq(cultureProfiles.userType, 'seeker')) }),
      ctx.db.query.cultureProfiles.findFirst({ where: and(eq(cultureProfiles.userId, job.employerId), eq(cultureProfiles.userType, 'employer')) }),
    ]);
    if (!seeker || !employer) return null;
    return structured<{ score: number; reasons: string[] }>(
      'You compare a candidate and employer culture profile and score fit. Be honest.',
      `<user_content>\nCANDIDATE:\n${answersToText(seeker.answers)}\n\nEMPLOYER:\n${answersToText(employer.answers)}\n</user_content>`,
      MATCH_TOOL,
      { model: MODEL_FAST, maxTokens: 400 },
    );
  }),
});
