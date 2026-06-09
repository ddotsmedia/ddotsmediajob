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
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI extraction is unavailable right now. Please try again in a moment, or fill the form manually.' });
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
});
