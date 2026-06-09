import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { jobs, jobseekerProfiles, eq, and, gte, ne, isNotNull } from '@ddots/db';
import { formatSalary } from '@ddots/shared';
import { router, protectedProcedure, employerProcedure, adminProcedure } from '../trpc';
import {
  chat,
  structured,
  structuredFromImage,
  MATCH_TOOL,
  CV_TOOL,
  JOB_DRAFT_TOOL,
  MODEL_FAST,
  MODEL_SMART,
  type ChatMessage,
  type MatchResult,
  type CvResult,
  type JobDraft,
} from '../lib/anthropic';
import { applications, sql } from '@ddots/db';
import { enforceRateLimit, isJailbreakAttempt, wrapUserContent, ssrfSafeFetchText } from '../lib/security';

/** Rate-limit AI usage per user + reject prompt-injection attempts. */
async function guardAi(ctx: { session: { user: { id: string; role: string } } }, text?: string): Promise<void> {
  const isAdmin = ctx.session.user.role === 'admin';
  await enforceRateLimit(`ai:${ctx.session.user.id}`, isAdmin ? 200 : 50, 3600);
  if (text && isJailbreakAttempt(text)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'This request was blocked.' });
  }
}

const messages = z
  .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) }))
  .max(40);

const JOB_EXTRACT_SYSTEM =
  'You are a UAE recruitment expert. Extract or generate structured job data and call the job_draft function. ' +
  'Know all 7 UAE emirates, common job categories, WPS salary norms (monthly AED), visa terminology, free zones, and standard UAE benefits. ' +
  'Map locations to the correct emirate slug. If salary is unstated use 0. Set each confidence field to high/medium/low based on how certain the value is from the source.';

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
      await guardAi(ctx, input.messages.at(-1)?.content);
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

  /** STAR interview coach: score a behavioural answer 0-25 per S/T/A/R + suggestions (Haiku). */
  starInterviewCoach: protectedProcedure
    .input(z.object({ question: z.string().min(3).max(500), answer: z.string().min(10).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.answer);
      const STAR_TOOL = {
        name: 'star_score',
        description: 'Score a behavioural interview answer using the STAR framework for the UAE workplace.',
        input_schema: {
          type: 'object' as const,
          properties: {
            situation: { type: 'integer', description: 'Was the context clear? 0-25' },
            task: { type: 'integer', description: 'Was the role/challenge defined? 0-25' },
            action: { type: 'integer', description: 'Were specific steps described? 0-25' },
            result: { type: 'integer', description: 'Was a measurable outcome included? 0-25' },
            verdict: { type: 'string', enum: ['strong', 'good', 'needs_work'] },
            suggestions: { type: 'array', items: { type: 'string' }, description: '2-4 specific, UAE-aware improvements' },
          },
          required: ['situation', 'task', 'action', 'result', 'verdict', 'suggestions'],
        },
      };
      const schema = z.object({
        situation: z.number().int().min(0).max(25),
        task: z.number().int().min(0).max(25),
        action: z.number().int().min(0).max(25),
        result: z.number().int().min(0).max(25),
        verdict: z.enum(['strong', 'good', 'needs_work']),
        suggestions: z.array(z.string().max(400)).max(6),
      });
      try {
        const raw = await structured<unknown>(
          'You are an interview coach for the UAE job market. Score the candidate answer against the STAR framework (Situation, Task, Action, Result), 0-25 each. Be specific and reference UAE workplace norms (professionalism, hierarchy, cultural fit) where relevant. Call star_score.',
          `Behavioural question:\n${wrapUserContent(input.question)}\n\nCandidate answer:\n${wrapUserContent(input.answer)}`,
          STAR_TOOL as never,
          { model: MODEL_FAST, maxTokens: 900 },
        );
        const r = schema.parse(raw);
        return { ...r, total: r.situation + r.task + r.action + r.result };
      } catch (err) {
        console.error('[starInterviewCoach]', err);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Coaching is unavailable right now. Please try again in a moment.' });
      }
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
  hrChatbot: employerProcedure.input(z.object({ messages })).mutation(async ({ ctx, input }) => {
    await guardAi(ctx, input.messages.at(-1)?.content);
    const last = input.messages.at(-1)?.content ?? '';
    const complex = last.length > 200 || /polic|legal|gratuity|terminat|labou?r law|visa cancel/i.test(last);
    const reply = await chat(
      'You are an HR assistant for UAE employers. Answer questions about hiring, UAE labour law basics, and using DdotsMediaJobs. Be concise and flag when professional/legal advice is needed.',
      input.messages as ChatMessage[],
      { model: complex ? MODEL_SMART : MODEL_FAST, maxTokens: 800 },
    );
    return { reply, model: complex ? 'sonnet' : 'haiku' };
  }),

  // ── Admin job ingestion (Haiku) ──────────────────────────────────
  extractJobFromText: adminProcedure
    .input(z.object({ text: z.string().min(15).max(15000) }).strict())
    .mutation(async ({ ctx, input }): Promise<JobDraft> => {
      await guardAi(ctx, input.text);
      try {
        return await structured<JobDraft>(JOB_EXTRACT_SYSTEM, `Extract a job posting from this text:\n\n${wrapUserContent(input.text)}`, JOB_DRAFT_TOOL, {
          model: MODEL_FAST,
          maxTokens: 1800,
        });
      } catch (err) {
        console.error('[extractJobFromText]', err);
        const over = err instanceof Error && /\b429\b|quota|rate limit/i.test(err.message);
        throw new TRPCError({
          code: over ? 'TOO_MANY_REQUESTS' : 'INTERNAL_SERVER_ERROR',
          message: over
            ? 'AI is over its quota right now — please wait ~60 seconds and try again, or fill the form manually.'
            : 'AI extraction is unavailable right now. Please try again, or fill the form manually.',
        });
      }
    }),

  extractJobFromUrl: adminProcedure
    .input(z.object({ url: z.string().url() }).strict())
    .mutation(async ({ ctx, input }): Promise<JobDraft> => {
      await guardAi(ctx);
      // SSRF-safe fetch: https-only, no private IPs, no redirects, 5s/1MB cap.
      const html = await ssrfSafeFetchText(input.url);
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 9000);
      if (text.length < 40) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No readable job content found at that URL.' });
      return structured<JobDraft>(JOB_EXTRACT_SYSTEM, `Extract the job posting from this scraped page text:\n\n${wrapUserContent(text)}`, JOB_DRAFT_TOOL, {
        model: MODEL_FAST,
        maxTokens: 1800,
      });
    }),

  generateFromQuickForm: adminProcedure
    .input(z.object({ title: z.string().min(2).max(160), emirate: z.string().max(40), whatsapp: z.string().max(30).optional() }).strict())
    .mutation(async ({ ctx, input }): Promise<JobDraft> => {
      await guardAi(ctx, input.title);
      return structured<JobDraft>(
        JOB_EXTRACT_SYSTEM,
        `Generate a complete, realistic UAE job posting for: title="${input.title}", emirate="${input.emirate}". ${input.whatsapp ? `Contact WhatsApp: ${input.whatsapp}.` : ''} Invent sensible responsibilities, requirements, benefits and a realistic AED salary range. Set confidence to "medium" since this is generated, not extracted.`,
        JOB_DRAFT_TOOL,
        { model: MODEL_FAST, maxTokens: 1800 },
      );
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

  // Auto-Complete: Job Title Suggestions
  autoCompleteJobTitle: protectedProcedure
    .input(z.object({
      partial: z.string().min(3).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx);
      const text = await chat(
        'You are a UAE recruitment expert. Suggest professional job titles.',
        [{ role: 'user', content: `Complete this job title with a professional suggestion. Return ONLY the completed title (3-4 words max), no quotes:\n${wrapUserContent(input.partial)}` }],
        { model: MODEL_FAST, maxTokens: 50 },
      );
      return { suggestion: text.trim() };
    }),

  // Auto-Complete: Job Description Continuation
  continueJobDescription: protectedProcedure
    .input(z.object({
      existing: z.string().min(50).max(3000),
      style: z.enum(['professional', 'casual', 'detailed']).default('professional'),
    }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx);
      const text = await chat(
        'You are a UAE recruitment expert writing job descriptions.',
        [{ role: 'user', content: `Continue writing this job description in ${input.style} tone. Generate 2-3 additional paragraphs that naturally follow:\n\n${wrapUserContent(input.existing)}\n\n---\n[Continue from here]` }],
        { model: MODEL_FAST, maxTokens: 800 },
      );
      return { continuation: text };
    }),

  // Translate Job to Arabic
  translateJobToArabic: protectedProcedure
    .input(z.object({
      title: z.string().max(160),
      description: z.string().max(10000),
      requirements: z.string().max(2000).optional(),
      benefits: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx);
      const result = await structured<{
        titleAr: string;
        descriptionAr: string;
        requirementsAr?: string;
        benefitsAr: string[];
      }>(
        'You are a professional translator specializing in UAE job postings. Translate to formal Arabic maintaining professional tone.',
        `Translate this job posting to Arabic:\n\nTitle: ${wrapUserContent(input.title)}\n\nDescription: ${wrapUserContent(input.description)}\n\nRequirements: ${wrapUserContent(input.requirements || '')}\n\nBenefits: ${input.benefits.map(b => wrapUserContent(b)).join('; ')}`,
        {
          name: 'arabic_translation',
          description: 'Arabic translation of job posting fields.',
          input_schema: {
            type: 'object',
            properties: {
              titleAr: { type: 'string' },
              descriptionAr: { type: 'string' },
              requirementsAr: { type: 'string' },
              benefitsAr: { type: 'array', items: { type: 'string' } },
            },
            required: ['titleAr', 'descriptionAr', 'benefitsAr'],
          },
        },
        { model: MODEL_FAST, maxTokens: 3000 },
      );
      return result;
    }),

  // Extract Job from a poster image / PDF (Claude Vision)
  extractJobFromImage: adminProcedure
    .input(z.object({
      imageBase64: z.string().min(100).max(8_000_000),
      mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx);
      return structuredFromImage<JobDraft>(
        JOB_EXTRACT_SYSTEM,
        'Read this UAE job poster and extract the job posting. Capture salary, contact number/email, location/emirate, visa & accommodation, and requirements exactly as shown. If a field is absent, omit it.',
        input.imageBase64,
        input.mediaType,
        JOB_DRAFT_TOOL,
        { model: MODEL_SMART, maxTokens: 1800 },
      );
    }),

  // Smart Expiry Suggestion
  smartExpirySuggestion: protectedProcedure
    .input(z.object({
      categorySlug: z.string().max(40),
      emirateSlug: z.string().max(40),
      isUrgent: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Query similar jobs to get average expiry period
      const similarJobs = await ctx.db.query.jobs.findMany({
        where: and(
          eq(jobs.categorySlug, input.categorySlug),
          eq(jobs.emirateSlug, input.emirateSlug),
          eq(jobs.status, 'active'),
          isNotNull(jobs.publishedAt),
          isNotNull(jobs.expiresAt),
        ),
        columns: { publishedAt: true, expiresAt: true },
        limit: 50,
      });

      let avgDaysToExpiry = 21; // default
      if (similarJobs.length > 5) {
        const totalDays = similarJobs.reduce((sum, j) => {
          if (j.publishedAt && j.expiresAt) {
            return sum + Math.round((j.expiresAt.getTime() - j.publishedAt.getTime()) / (24 * 3600 * 1000));
          }
          return sum;
        }, 0);
        avgDaysToExpiry = Math.round(totalDays / similarJobs.length);
      }

      const suggested = input.isUrgent ? 14 : Math.max(avgDaysToExpiry || 21, 14);
      const suggestedDate = new Date(Date.now() + suggested * 24 * 3600 * 1000);

      return {
        suggestedDays: suggested,
        suggestedDate: suggestedDate.toISOString().split('T')[0],
        reasoning: input.isUrgent
          ? 'Urgent roles typically fill in 2–3 weeks'
          : `Similar roles in this category typically fill in ${suggested} days`,
      };
    }),

  // Duplicate Job Detector
  checkDuplicate: protectedProcedure
    .input(z.object({
      title: z.string().max(160),
      employerId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is accessing their own jobs or is admin
      if (input.employerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Find similar job titles posted recently
      const matches = await ctx.db.query.jobs.findMany({
        where: and(
          eq(jobs.employerId, input.employerId),
          ne(jobs.status, 'rejected'),
          gte(jobs.createdAt, new Date(Date.now() - 60 * 24 * 3600 * 1000)),
        ),
        columns: { id: true, title: true, createdAt: true, applicationCount: true },
        limit: 5,
      });

      // Simple string similarity check
      const titleLower = input.title.toLowerCase();
      const similar = matches.find(m => {
        const titleWords = new Set(titleLower.split(/\s+/));
        const mWords = new Set(m.title.toLowerCase().split(/\s+/));
        const common = [...titleWords].filter(w => mWords.has(w)).length;
        return common >= titleWords.size * 0.7;
      });

      if (!similar) {
        return { duplicate: false };
      }

      return {
        duplicate: true,
        job: {
          id: similar.id,
          title: similar.title,
          applicants: similar.applicationCount,
          postedAgo: `${Math.round((Date.now() - similar.createdAt.getTime()) / (24 * 3600 * 1000))} days ago`,
        },
      };
    }),

  // Predict Job Performance
  predictJobPerformance: protectedProcedure
    .input(z.object({
      categorySlug: z.string().max(40),
      emirateSlug: z.string().max(40),
      salaryMin: z.number().optional(),
      featured: z.boolean().default(false),
      urgent: z.boolean().default(false),
      waBlast: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Query similar jobs
      const similarJobs = await ctx.db.query.jobs.findMany({
        where: and(
          eq(jobs.categorySlug, input.categorySlug),
          eq(jobs.emirateSlug, input.emirateSlug),
          eq(jobs.status, 'active'),
          gte(jobs.createdAt, new Date(Date.now() - 90 * 24 * 3600 * 1000)),
        ),
        columns: { applicationCount: true, viewCount: true },
        limit: 50,
      });

      if (similarJobs.length < 3) {
        return {
          estApplies7days: '8–12',
          estViews7days: '120–200',
          timeToFirstApply: '~6h',
          salaryWarning: null,
        };
      }

      const avgApps = Math.round(similarJobs.reduce((s, j) => s + j.applicationCount, 0) / similarJobs.length);
      const avgViews = Math.round(similarJobs.reduce((s, j) => s + j.viewCount, 0) / similarJobs.length);

      let apps = avgApps;
      let views = avgViews;
      if (input.featured) { apps = Math.round(apps * 2); views = Math.round(views * 2); }
      if (input.urgent) { apps = Math.round(apps * 1.5); views = Math.round(views * 1.5); }
      if (input.waBlast) { apps = Math.round(apps * 3); views = Math.round(views * 2); }

      return {
        estApplies7days: `${Math.max(apps - 5, 1)}–${Math.max(apps + 5, 1)}`,
        estViews7days: `${Math.max(views - 30, 1)}–${Math.max(views + 30, 1)}`,
        timeToFirstApply: avgApps > 50 ? '~30min' : avgApps > 20 ? '~2h' : '~4h',
        salaryWarning: input.salaryMin && input.salaryMin < 5000 ? 'Below-market salary may reduce applications by ~40%' : null,
      };
    }),

  // Boost Recommender
  recommendBoosts: protectedProcedure
    .input(z.object({
      categorySlug: z.string().max(40),
      emirateSlug: z.string().max(40),
      deadline: z.date(),
      vacancies: z.number().default(1),
      salaryMin: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const daysUntilDeadline = Math.ceil((input.deadline.getTime() - Date.now()) / (24 * 3600 * 1000));
      const waCategories = ['driver', 'nurse', 'hospitality', 'construction', 'cleaner', 'chef', 'accountant', 'sales'];

      return {
        featured: {
          recommended: true,
          reason: 'Featured listings typically get 2–3x more visibility',
        },
        urgent: {
          recommended: daysUntilDeadline < 14 || input.vacancies > 3,
          reason: daysUntilDeadline < 14 ? 'Tight deadline—urgency badge helps' : 'Multiple vacancies—show urgency',
        },
        waBlast: {
          recommended: waCategories.some(c => input.categorySlug.toLowerCase().includes(c)),
          reason: 'High WhatsApp engagement for this category',
        },
      };
    }),

  // ═══════════════════════ Phase 5 — additional AI features (Haiku) ═══════════════════════

  /** Standardise a raw job title → clean title + MOHRE title + category slug (Haiku). */
  jobTitleNormaliser: protectedProcedure
    .input(z.object({ title: z.string().min(2).max(160) }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.title);
      const TOOL = { name: 'normalise', description: 'Normalise a UAE job title.', input_schema: { type: 'object' as const, properties: {
        normalizedTitle: { type: 'string' }, mohreTitle: { type: 'string', description: 'Closest MOHRE occupation title' },
        categorySlug: { type: 'string', enum: ['it', 'healthcare', 'finance', 'sales', 'construction', 'hospitality', 'driving', 'education', 'admin', 'manufacturing', 'security', 'beauty'] },
      }, required: ['normalizedTitle', 'mohreTitle', 'categorySlug'] } };
      const schema = z.object({ normalizedTitle: z.string().max(160), mohreTitle: z.string().max(160), categorySlug: z.string() });
      const raw = await structured<unknown>('You normalise UAE job titles to MOHRE standards. Call normalise.', wrapUserContent(input.title), TOOL as never, { model: MODEL_FAST, maxTokens: 200 });
      return schema.parse(raw);
    }),

  /** Benchmark a salary against the UAE market for a role/emirate (Haiku). */
  salaryBenchmark: protectedProcedure
    .input(z.object({ title: z.string().min(2).max(160), emirate: z.string().max(40).optional(), salary: z.number().int().nonnegative().optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.title);
      const TOOL = { name: 'benchmark', description: 'Benchmark a UAE salary.', input_schema: { type: 'object' as const, properties: {
        marketMin: { type: 'integer', description: 'Monthly AED' }, marketMax: { type: 'integer' }, marketAvg: { type: 'integer' },
        verdict: { type: 'string', enum: ['below', 'fair', 'above'] }, comment: { type: 'string', description: 'One sentence' },
      }, required: ['marketMin', 'marketMax', 'marketAvg', 'verdict', 'comment'] } };
      const schema = z.object({ marketMin: z.number().int(), marketMax: z.number().int(), marketAvg: z.number().int(), verdict: z.enum(['below', 'fair', 'above']), comment: z.string().max(300) });
      const raw = await structured<unknown>('You are a UAE compensation analyst. Give realistic monthly AED ranges. Call benchmark.',
        `Role: ${wrapUserContent(input.title)}\nEmirate: ${input.emirate ?? 'UAE'}\nOffered: ${input.salary ? 'AED ' + input.salary : 'n/a'}`, TOOL as never, { model: MODEL_FAST, maxTokens: 250 });
      return schema.parse(raw);
    }),

  /** Rewrite a CV bullet 3 ways, optionally tailored to a target job (Haiku). */
  resumeBulletRewriter: protectedProcedure
    .input(z.object({ bullet: z.string().min(5).max(600), targetJob: z.string().max(160).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.bullet);
      const content = await chat('You rewrite CV bullet points for UAE jobseekers. Return exactly 3 strong, achievement-focused rewrites as a markdown numbered list. Use action verbs and quantify where possible.',
        [{ role: 'user', content: `Bullet: ${wrapUserContent(input.bullet)}${input.targetJob ? `\nTarget role: ${input.targetJob}` : ''}` }], { model: MODEL_FAST, maxTokens: 400 });
      return { content };
    }),

  /** Draft a professional, constructive rejection message (Haiku, employer). */
  rejectionMessage: employerProcedure
    .input(z.object({ jobTitle: z.string().min(2).max(160), reason: z.string().max(400).optional(), candidateName: z.string().max(120).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.reason);
      const content = await chat('You write polite, professional, encouraging candidate rejection messages for UAE employers. Keep under 120 words, warm but clear, no false promises.',
        [{ role: 'user', content: `Role: ${input.jobTitle}\nCandidate: ${input.candidateName ?? 'Candidate'}\nReason (internal): ${input.reason ? wrapUserContent(input.reason) : 'not a fit at this time'}` }], { model: MODEL_FAST, maxTokens: 300 });
      return { content };
    }),

  /** Personalised candidate outreach message (Haiku, employer). */
  candidateOutreach: employerProcedure
    .input(z.object({ candidateSummary: z.string().min(5).max(1200), jobTitle: z.string().min(2).max(160) }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.candidateSummary);
      const content = await chat('You write short, personalised recruiter outreach messages for UAE candidates. Friendly, specific, under 110 words, with a clear call to action.',
        [{ role: 'user', content: `Hiring for: ${input.jobTitle}\nCandidate: ${wrapUserContent(input.candidateSummary)}` }], { model: MODEL_FAST, maxTokens: 280 });
      return { content };
    }),

  /** Detect biased / non-inclusive language in a job description (Haiku, employer). */
  biasDetector: employerProcedure
    .input(z.object({ description: z.string().min(20).max(8000) }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.description);
      const TOOL = { name: 'bias', description: 'Flag biased language in a job description.', input_schema: { type: 'object' as const, properties: {
        score: { type: 'integer', description: '0 (inclusive) - 100 (heavily biased)' }, flags: { type: 'array', items: { type: 'string' }, description: 'Problem phrases + why' },
        rewritten: { type: 'string', description: 'Inclusive rewrite of the description' },
      }, required: ['score', 'flags', 'rewritten'] } };
      const schema = z.object({ score: z.number().int().min(0).max(100), flags: z.array(z.string().max(300)).max(20), rewritten: z.string().max(8000) });
      const raw = await structured<unknown>('You audit UAE job descriptions for biased, discriminatory or non-inclusive language (age, gender, nationality, marital status). Call bias.',
        wrapUserContent(input.description), TOOL as never, { model: MODEL_FAST, maxTokens: 1500 });
      return schema.parse(raw);
    }),

  /** Scam / fraud risk score for a job listing (Haiku). */
  jobScamDetector: protectedProcedure
    .input(z.object({ listing: z.string().min(20).max(8000) }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.listing);
      const TOOL = { name: 'scam', description: 'Score scam risk of a UAE job listing.', input_schema: { type: 'object' as const, properties: {
        score: { type: 'integer', description: '0 (legit) - 100 (likely scam)' }, verdict: { type: 'string', enum: ['safe', 'caution', 'high_risk'] },
        flags: { type: 'array', items: { type: 'string' } },
      }, required: ['score', 'verdict', 'flags'] } };
      const schema = z.object({ score: z.number().int().min(0).max(100), verdict: z.enum(['safe', 'caution', 'high_risk']), flags: z.array(z.string().max(300)).max(20) });
      const raw = await structured<unknown>('You detect job scams targeting UAE jobseekers (upfront fees, visa-payment requests, too-good salaries, personal-account contact). Call scam.',
        wrapUserContent(input.listing), TOOL as never, { model: MODEL_FAST, maxTokens: 600 });
      return schema.parse(raw);
    }),

  /** Generate 2 A/B variants of a job description (Haiku, employer). */
  abTestJobDescription: employerProcedure
    .input(z.object({ description: z.string().min(20).max(8000) }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.description);
      const content = await chat('You optimise UAE job ads. Produce 2 distinct variants (A: benefits-led, B: mission-led) of the description as markdown with "## Variant A" and "## Variant B" headings. Keep each compelling and scannable.',
        [{ role: 'user', content: wrapUserContent(input.description) }], { model: MODEL_FAST, maxTokens: 1600 });
      return { content };
    }),

  /** Optimise a LinkedIn headline + summary (Haiku). */
  linkedinOptimiser: protectedProcedure
    .input(z.object({ headline: z.string().max(220).optional(), summary: z.string().max(2600).optional(), role: z.string().max(160).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.summary ?? input.headline);
      const content = await chat('You optimise LinkedIn profiles for UAE professionals. Return markdown: an improved headline (1 line) and a rewritten 3-4 sentence summary, keyword-rich and recruiter-friendly.',
        [{ role: 'user', content: `Target role: ${input.role ?? '—'}\nHeadline: ${input.headline ? wrapUserContent(input.headline) : '—'}\nSummary: ${input.summary ? wrapUserContent(input.summary) : '—'}` }], { model: MODEL_FAST, maxTokens: 500 });
      return { content };
    }),

  /** Relocation advisor for moving to the UAE (Haiku). */
  relocationAdvisor: protectedProcedure
    .input(z.object({ country: z.string().min(2).max(80), role: z.string().min(2).max(160), salary: z.number().int().nonnegative().optional(), familySize: z.number().int().min(1).max(12).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, `${input.country} ${input.role}`);
      const content = await chat('You are a UAE relocation advisor. Given origin country, role, salary and family size, return markdown: best-fit emirate, visa route, monthly cost-of-living estimate, rough net savings, and a 30-day action plan. Practical and UAE-specific, under 320 words.',
        [{ role: 'user', content: `From: ${input.country}\nRole: ${input.role}\nSalary: ${input.salary ? 'AED ' + input.salary : 'n/a'}\nFamily size: ${input.familySize ?? 1}` }], { model: MODEL_FAST, maxTokens: 900 });
      return { content };
    }),

  /** Predict a 3-step career path with salary milestones (Haiku). */
  careerPathPredictor: protectedProcedure
    .input(z.object({ role: z.string().min(2).max(160), years: z.number().int().min(0).max(50).optional(), emirate: z.string().max(40).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.role);
      const content = await chat('You map UAE career paths. Return markdown: 3 progression steps from the current role, each with a likely title, timeframe, key skills to gain, and an AED monthly salary range. UAE market realistic.',
        [{ role: 'user', content: `Current role: ${input.role}\nExperience: ${input.years ?? '—'} yrs\nEmirate: ${input.emirate ?? 'UAE'}` }], { model: MODEL_FAST, maxTokens: 700 });
      return { content };
    }),

  /** Salary-negotiation roleplay simulator — one turn (Haiku). */
  negotiationSimulator: protectedProcedure
    .input(z.object({ role: z.string().min(2).max(160), messages }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.messages.at(-1)?.content);
      const reply = await chat(`You roleplay a UAE hiring manager in a salary negotiation for a ${input.role}. Respond in character, push back realistically but fairly, and after your reply add one short coaching tip prefixed "Coach:". Keep under 160 words.`,
        input.messages as ChatMessage[], { model: MODEL_FAST, maxTokens: 500 });
      return { reply };
    }),

  /** 6-month career transition plan between roles (Haiku). */
  careerTransitionPlan: protectedProcedure
    .input(z.object({ fromRole: z.string().min(2).max(160), toRole: z.string().min(2).max(160), months: z.number().int().min(1).max(24).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, `${input.fromRole} ${input.toRole}`);
      const content = await chat('You build UAE career-transition plans. Return a markdown month-by-month plan to move between the two roles: skills to learn, certifications, portfolio, and networking. Practical, UAE-relevant.',
        [{ role: 'user', content: `From: ${input.fromRole}\nTo: ${input.toRole}\nTimeline: ${input.months ?? 6} months` }], { model: MODEL_FAST, maxTokens: 900 });
      return { content };
    }),

  /** Weekly job-search action plan (Haiku). */
  jobSearchPlanner: protectedProcedure
    .input(z.object({ currentRole: z.string().max(160).optional(), targetRole: z.string().min(2).max(160), weeks: z.number().int().min(1).max(26).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.targetRole);
      const content = await chat('You create week-by-week UAE job-search plans. Return markdown with weekly goals: applications targets, networking, skill-building, and follow-ups. Concrete and motivating.',
        [{ role: 'user', content: `Current: ${input.currentRole ?? '—'}\nTarget: ${input.targetRole}\nWeeks: ${input.weeks ?? 4}` }], { model: MODEL_FAST, maxTokens: 800 });
      return { content };
    }),

  /** Interview question bank: 20 questions + rubrics for a role (Haiku, employer). */
  interviewQuestionBank: employerProcedure
    .input(z.object({ title: z.string().min(2).max(160), requirements: z.string().max(3000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.requirements ?? input.title);
      const content = await chat('You build UAE interview question banks for employers. Return markdown: 20 questions grouped (technical, behavioural, situational, culture-fit), each with a one-line scoring rubric.',
        [{ role: 'user', content: `Role: ${input.title}\nRequirements: ${input.requirements ? wrapUserContent(input.requirements) : '—'}` }], { model: MODEL_FAST, maxTokens: 1800 });
      return { content };
    }),

  /** Analyse company culture from job ads + reviews text (Haiku, employer). */
  companyCultureAnalyser: employerProcedure
    .input(z.object({ jobAdsText: z.string().min(20).max(8000), reviewsText: z.string().max(8000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.jobAdsText);
      const content = await chat('You analyse employer culture for UAE companies. From the provided job ads and reviews, return markdown: a culture summary, top 5 values signalled, and 3 employer-brand improvement tips.',
        [{ role: 'user', content: `JOB ADS:\n${wrapUserContent(input.jobAdsText)}\n\nREVIEWS:\n${input.reviewsText ? wrapUserContent(input.reviewsText) : '—'}` }], { model: MODEL_FAST, maxTokens: 900 });
      return { content };
    }),

  /** Retention / attrition risk for a candidate-role fit (Haiku, employer). */
  retentionRiskPredictor: employerProcedure
    .input(z.object({ candidateSummary: z.string().min(10).max(2000), role: z.string().min(2).max(160) }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.candidateSummary);
      const TOOL = { name: 'retention', description: 'Predict retention risk.', input_schema: { type: 'object' as const, properties: {
        riskScore: { type: 'integer', description: '0 (will stay) - 100 (high flight risk)' }, level: { type: 'string', enum: ['low', 'medium', 'high'] },
        factors: { type: 'array', items: { type: 'string' } }, tips: { type: 'array', items: { type: 'string' } },
      }, required: ['riskScore', 'level', 'factors', 'tips'] } };
      const schema = z.object({ riskScore: z.number().int().min(0).max(100), level: z.enum(['low', 'medium', 'high']), factors: z.array(z.string().max(300)).max(10), tips: z.array(z.string().max(300)).max(10) });
      const raw = await structured<unknown>('You assess employee retention risk in the UAE context (visa stability, salary fit, overqualification, commute). Call retention.',
        `Role: ${input.role}\nCandidate: ${wrapUserContent(input.candidateSummary)}`, TOOL as never, { model: MODEL_FAST, maxTokens: 600 });
      return schema.parse(raw);
    }),

  /** Summarise a candidate pipeline from pasted applicant data (Haiku, employer). */
  candidatePipelineSummary: employerProcedure
    .input(z.object({ jobTitle: z.string().min(2).max(160), applicantsText: z.string().min(10).max(12000) }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.applicantsText);
      const content = await chat('You summarise hiring pipelines for UAE employers. Return markdown: top 3 candidates with why, overall quality read, and recommended next actions.',
        [{ role: 'user', content: `Role: ${input.jobTitle}\nApplicants:\n${wrapUserContent(input.applicantsText)}` }], { model: MODEL_FAST, maxTokens: 900 });
      return { content };
    }),

  /** Step-by-step UAE labour complaint guide (Haiku). */
  labourComplaintGuide: protectedProcedure
    .input(z.object({ issueType: z.string().min(2).max(160), emirate: z.string().max(40).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.issueType);
      const content = await chat('You guide UAE workers on labour complaints. Return markdown: clear steps to resolve the issue, who to contact (MOHRE 800 60, relevant authority), documents needed, and timelines. Note this is general info, not legal advice.',
        [{ role: 'user', content: `Issue: ${wrapUserContent(input.issueType)}\nEmirate: ${input.emirate ?? 'UAE'}` }], { model: MODEL_FAST, maxTokens: 800 });
      return { content };
    }),

  /** MOHRE work-permit eligibility check (Haiku). */
  checkPermitEligibility: protectedProcedure
    .input(z.object({ role: z.string().min(2).max(160), salary: z.number().int().nonnegative(), nationality: z.string().max(80).optional(), companySize: z.string().max(40).optional() }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, input.role);
      const content = await chat('You assess UAE work-permit eligibility at a high level. Return markdown: likely permit category, eligibility verdict, any gaps to fix, and required documents. General guidance, not legal advice.',
        [{ role: 'user', content: `Role: ${input.role}\nSalary: AED ${input.salary}\nNationality: ${input.nationality ?? '—'}\nCompany size: ${input.companySize ?? '—'}` }], { model: MODEL_FAST, maxTokens: 600 });
      return { content };
    }),

  /** New-hire onboarding checklist by nationality + emirate (Haiku). */
  generateOnboardingChecklist: protectedProcedure
    .input(z.object({ nationality: z.string().min(2).max(80), emirate: z.string().min(2).max(40) }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx, `${input.nationality} ${input.emirate}`);
      const content = await chat('You create UAE onboarding checklists for new hires. Return a markdown checklist: visa/medical/Emirates ID steps, bank account, ejari/tenancy basics, and first-week tasks, tailored to nationality and emirate.',
        [{ role: 'user', content: `Nationality: ${input.nationality}\nEmirate: ${input.emirate}` }], { model: MODEL_FAST, maxTokens: 800 });
      return { content };
    }),

  /** Emiratization compliance plan for an employer (Haiku, employer). */
  emiratizationAssistant: employerProcedure
    .input(z.object({ companySize: z.number().int().min(1).max(100000), currentNationals: z.number().int().min(0).max(100000) }))
    .mutation(async ({ ctx, input }) => {
      await guardAi(ctx);
      const content = await chat('You advise UAE employers on Emiratization and Nafis compliance. Return markdown: target Emirati headcount, current gap, a hiring plan, and Nafis incentives available. Practical and current.',
        [{ role: 'user', content: `Company size: ${input.companySize}\nCurrent Emirati staff: ${input.currentNationals}` }], { model: MODEL_FAST, maxTokens: 700 });
      return { content };
    }),

  // ── Blog assist (Haiku, admin) ──────────────────────────────────
  blogImprove: adminProcedure.input(z.object({ content: z.string().min(20).max(20000) })).mutation(async ({ ctx, input }) => {
    await guardAi(ctx, input.content);
    const content = await chat('You improve blog drafts for a UAE jobs site. Return the improved article in clean markdown — stronger structure, clarity, SEO headings — keeping the meaning.', [{ role: 'user', content: wrapUserContent(input.content) }], { model: MODEL_FAST, maxTokens: 2500 });
    return { content };
  }),
  blogExcerpt: adminProcedure.input(z.object({ content: z.string().min(20).max(20000) })).mutation(async ({ ctx, input }) => {
    await guardAi(ctx, input.content);
    const content = await chat('Write a single compelling 1-2 sentence excerpt (max 200 chars) for this article. Return only the excerpt.', [{ role: 'user', content: wrapUserContent(input.content) }], { model: MODEL_FAST, maxTokens: 120 });
    return { excerpt: content.trim().slice(0, 280) };
  }),
  blogTags: adminProcedure.input(z.object({ content: z.string().min(20).max(20000) })).mutation(async ({ ctx, input }) => {
    await guardAi(ctx, input.content);
    const content = await chat('Return 4-8 lowercase, hyphenated SEO tags for this UAE jobs article as a comma-separated list. Only the list.', [{ role: 'user', content: wrapUserContent(input.content) }], { model: MODEL_FAST, maxTokens: 120 });
    const tags = content.split(',').map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')).filter(Boolean).slice(0, 8);
    return { tags };
  }),
  blogSEO: adminProcedure.input(z.object({ title: z.string().min(2).max(200), content: z.string().min(20).max(20000) })).mutation(async ({ ctx, input }) => {
    await guardAi(ctx, input.content);
    const TOOL = { name: 'seo', description: 'SEO meta for an article.', input_schema: { type: 'object' as const, properties: {
      metaTitle: { type: 'string', description: 'Max 60 chars' }, metaDescription: { type: 'string', description: 'Max 160 chars' },
    }, required: ['metaTitle', 'metaDescription'] } };
    const schema = z.object({ metaTitle: z.string().max(120), metaDescription: z.string().max(320) });
    const raw = await structured<unknown>('You write SEO meta tags for a UAE jobs blog. Call seo.', `Title: ${input.title}\n${wrapUserContent(input.content.slice(0, 4000))}`, TOOL as never, { model: MODEL_FAST, maxTokens: 200 });
    return schema.parse(raw);
  }),

  /** Content moderation score for community text (Haiku, admin). */
  contentModeration: adminProcedure.input(z.object({ text: z.string().min(1).max(8000) })).mutation(async ({ ctx, input }) => {
    await guardAi(ctx, input.text);
    const TOOL = { name: 'moderate', description: 'Moderate user text.', input_schema: { type: 'object' as const, properties: {
      flagScore: { type: 'integer', description: '0 (clean) - 100 (severe)' }, action: { type: 'string', enum: ['allow', 'review', 'block'] }, flags: { type: 'array', items: { type: 'string' } },
    }, required: ['flagScore', 'action', 'flags'] } };
    const schema = z.object({ flagScore: z.number().int().min(0).max(100), action: z.enum(['allow', 'review', 'block']), flags: z.array(z.string().max(200)).max(15) });
    const raw = await structured<unknown>('You moderate community posts for a UAE jobs platform (spam, scams, harassment, personal data, hate). Call moderate.', wrapUserContent(input.text), TOOL as never, { model: MODEL_FAST, maxTokens: 400 });
    return schema.parse(raw);
  }),

  /** Weekly seeker-behaviour insights from pasted log data (Haiku, admin). */
  seekerBehaviourInsights: adminProcedure.input(z.object({ logsText: z.string().min(10).max(12000) })).mutation(async ({ ctx, input }) => {
    await guardAi(ctx, input.logsText);
    const content = await chat('You analyse jobseeker activity for a UAE jobs admin. Return markdown: key trends, drop-off points, and 3 recommended actions to boost engagement.', [{ role: 'user', content: wrapUserContent(input.logsText) }], { model: MODEL_FAST, maxTokens: 800 });
    return { content };
  }),

  /** Weekly market-pulse report from pasted aggregate data (Haiku, admin). */
  marketPulseReport: adminProcedure.input(z.object({ dataText: z.string().min(10).max(12000) })).mutation(async ({ ctx, input }) => {
    await guardAi(ctx, input.dataText);
    const content = await chat('You write a weekly UAE jobs market-pulse report. From the data, return markdown: headline trends, hottest categories/emirates, salary movements, and an outlook. Concise and publishable.', [{ role: 'user', content: wrapUserContent(input.dataText) }], { model: MODEL_FAST, maxTokens: 900 });
    return { content };
  }),
});
