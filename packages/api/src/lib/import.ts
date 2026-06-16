import { z } from 'zod';
import { db, jobs, users, companies, notifications, eq, sql } from '@ddots/db';
import { slugify, inferExperienceLevel, JOB_TYPES } from '@ddots/shared';
import { structured, JOB_DRAFT_TOOL, MODEL_FAST, MODEL_SMART, type JobDraft } from './anthropic';
import { detectLanguage } from './ai-router';
import { wrapUserContent } from './security';

const SYSTEM =
  'You are a UAE recruitment expert. Extract structured job data from the message and call job_draft. ' +
  'Map locations to the correct emirate slug. If salary is unstated use 0. Set confidence per field.';

const SYSTEM_AR =
  'أنت خبير توظيف في الإمارات. استخرج بيانات الوظيفة من الرسالة واستدعِ job_draft. ' +
  'حوّل المواقع إلى slug الإمارة الصحيح (مثل دبي=dubai، أبوظبي=abu-dhabi، الشارقة=sharjah). ' +
  'حوّل الأرقام العربية إلى إنجليزية (٣٠٠٠ → 3000). إذا لم يُذكر الراتب استخدم 0. حدّد مستوى الثقة لكل حقل.';

// Job keywords in English + Arabic (مطلوب=required, وظيفة=job, شاغر=vacancy, راتب=salary, نبحث=seeking, فرصة عمل=job opportunity).
const JOB_KEYWORDS =
  /hiring|now hiring|vacanc|required|wanted|recruit|\bjobs?\b|job opening|positions?|position available|urgently|walk[\s-]?in|salary|send\s+(cv|resume)|whatsapp\s+cv|candidate|looking for|we\s+(are\s+)?(looking|need)|seeking|opening|opportunit(y|ies)|career opportunity|join our team|apply now|مطلوب|وظيفة|شاغر|راتب|توظيف|نبحث|فرصة\s*عمل/i;

/** Quick keyword gate so we don't burn AI on non-job chatter. */
export function isJobMessage(text: string): boolean {
  return JOB_KEYWORDS.test(text);
}

// Lenient — every field optional. We apply safe defaults rather than throw, so a
// partial AI response still yields a reviewable DRAFT instead of a Zod crash.
const draftSchema = z
  .object({
    title: z.string().max(200).optional(),
    description: z.string().optional(),
    categorySlug: z.string().max(40).optional(),
    emirate: z.string().max(40).optional(),
    jobType: z.string().max(30).optional(),
    company: z.string().max(200).optional(),
  })
  .passthrough();

const DEFAULT_JOB_TYPE = 'full-time';

export type SavedDraft = { title: string; slug: string };

async function notifyAdmins(source: string, title: string): Promise<void> {
  const admins = await db.query.users.findMany({ where: eq(users.role, 'admin'), columns: { id: true } });
  if (admins.length) {
    await db.insert(notifications).values(
      admins.map((a) => ({ userId: a.id, type: `${source}-import`, title: `New job draft from ${source}`, body: title, link: '/admin/jobs/drafts' })),
    );
  }
}

/**
 * Extract a job from free text via the resilient AI chain and save a DRAFT.
 * Never loses a message: dedups by whapi messageId, and on total AI failure
 * still saves the raw text as a "review needed" draft.
 */
export async function extractAndSaveDraft(text: string, source: string, sourceMetadata?: Record<string, unknown>, opts?: { autoPublish?: boolean }): Promise<SavedDraft | null> {
  try {
    const admin = await db.query.users.findFirst({ where: eq(users.role, 'admin') });
    if (!admin) { console.error('[import] no admin user — cannot save draft'); return null; }

    // Dedup: skip if this whapi message was already imported.
    const messageId = sourceMetadata?.messageId ? String(sourceMetadata.messageId) : null;
    if (messageId) {
      const dup = await db.select({ id: jobs.id }).from(jobs).where(sql`${jobs.sourceMetadata}->>'messageId' = ${messageId}`).limit(1);
      if (dup.length) { console.log('[import] duplicate messageId, skipping:', messageId); return null; }
    }

    // ── AI extraction (resilient: Anthropic → Groq → Gemini with backoff) ──
    let draft: JobDraft | null = null;
    let aiError: string | null = null;
    try {
      const isArabic = detectLanguage(text) === 'ar';
      const raw = await structured<JobDraft>(
        isArabic ? SYSTEM_AR : SYSTEM,
        `${isArabic ? 'استخرج تفاصيل الوظيفة من النص التالي' : 'Extract the job posting from this message'}:\n\n${wrapUserContent(text)}`,
        JOB_DRAFT_TOOL,
        { model: isArabic ? MODEL_SMART : MODEL_FAST, maxTokens: 1800 },
      );
      const parsed = draftSchema.safeParse(raw);
      const d = (parsed.success ? parsed.data : (raw ?? {})) as Partial<JobDraft> & Record<string, unknown>;
      draft = {
        ...(raw as JobDraft),
        title: (d.title?.toString().trim() || 'Untitled Job').slice(0, 200),
        description: d.description?.toString().trim() || d.title?.toString().trim() || 'See original message for details.',
        categorySlug: d.categorySlug?.toString().trim() || 'general',
        emirate: d.emirate?.toString().trim() || 'dubai',
        jobType: (JOB_TYPES as readonly string[]).includes(String(d.jobType)) ? String(d.jobType) : DEFAULT_JOB_TYPE,
        company: (d.company as string | undefined)?.toString().trim() || '',
      } as JobDraft;
    } catch (err) {
      aiError = err instanceof Error ? err.message : String(err);
      console.error('[import] all AI providers failed — saving raw fallback draft:', aiError);
    }

    // ── Last resort: never lose the message — save raw text as a draft ──
    if (!draft) {
      const slug = `whatsapp-import-${Math.random().toString(36).slice(2, 9)}`;
      await db.insert(jobs).values({
        slug,
        employerId: admin.id,
        companyId: null,
        title: 'WhatsApp Import — Review Needed',
        description: text.slice(0, 8000),
        categorySlug: 'general',
        emirateSlug: 'dubai',
        jobType: DEFAULT_JOB_TYPE as never,
        status: 'draft', // never auto-publish an unparsed message
        publishedAt: null,
        source,
        sourceMetadata: { ...(sourceMetadata ?? {}), rawText: text.slice(0, 4000), extractionStatus: 'failed', extractionError: aiError },
        aiGenerated: false,
      });
      await notifyAdmins(source, 'WhatsApp Import — Review Needed');
      return { title: 'WhatsApp Import — Review Needed', slug };
    }

    let companyId: string | null = null;
    if (draft.company?.trim()) {
      const slug = slugify(draft.company);
      const existing = await db.query.companies.findFirst({ where: eq(companies.slug, slug) });
      companyId = existing?.id ?? (await db.insert(companies).values({ slug, name: draft.company.trim(), industry: 'General' }).returning())[0]?.id ?? null;
    }

    // Negotiable salary if the source text says so (EN/AR) — clear any figure.
    const negotiable = /\bnegotiable\b|\bcompetitive\b|salary\s*tbd|to\s+be\s+(discussed|decided)|راتب\s*مفاوض|قابل\s*للتفاوض/i.test(text);

    const jobSlug = `${slugify(draft.title) || 'job'}-${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(jobs).values({
      slug: jobSlug,
      employerId: admin.id,
      companyId,
      title: draft.title,
      description: draft.description + (draft.requirements ? `\n\nRequirements:\n${draft.requirements}` : ''),
      categorySlug: draft.categorySlug,
      emirateSlug: draft.emirate,
      location: draft.area || null,
      jobType: draft.jobType as never,
      experienceLevel: inferExperienceLevel(`${text} ${draft.requirements ?? ''}`) as never, // inferred from text, null if absent
      salaryMin: negotiable ? null : draft.salaryMin || null,
      salaryMax: negotiable ? null : draft.salaryMax || null,
      salaryNegotiable: negotiable,
      visaProvided: draft.visaProvided,
      accommodationProvided: draft.accommodation,
      isRemote: draft.remote,
      isUrgent: draft.urgent,
      isFresher: draft.freshersWelcome,
      freeZone: draft.freeZone,
      skills: draft.tags ?? [],
      benefits: draft.benefits ?? [],
      contactWhatsapp: draft.contactWhatsapp || null,
      applyEmail: draft.contactEmail || null,
      status: opts?.autoPublish ? 'active' : 'draft',
      publishedAt: opts?.autoPublish ? new Date() : null,
      source,
      sourceMetadata: { ...(sourceMetadata ?? {}), extractionStatus: 'ok' },
      aiGenerated: true,
    });

    await notifyAdmins(source, draft.title);
    return { title: draft.title, slug: jobSlug };
  } catch (err) {
    console.error('[import] extractAndSaveDraft failed:', err instanceof Error ? (err.stack ?? err.message) : err);
    return null;
  }
}

/** One-line scam-risk verdict for a pasted job message (Haiku). Best-effort. */
export async function quickScamVerdict(text: string): Promise<string> {
  const TOOL = {
    name: 'scam_check',
    description: 'Assess UAE job-posting scam risk.',
    input_schema: { type: 'object' as const, properties: { risk: { type: 'string', enum: ['safe', 'caution', 'scam'] }, reason: { type: 'string' } }, required: ['risk', 'reason'] },
  };
  try {
    const r = await structured<{ risk: string; reason: string }>(
      'You detect UAE job scams (upfront fees, no company, personal/overseas numbers, unrealistic salary, passport/bank requests, urgency). Call scam_check.',
      wrapUserContent(text),
      TOOL as never,
      { model: MODEL_FAST, maxTokens: 300 },
    );
    const icon = r.risk === 'scam' ? '🚨' : r.risk === 'caution' ? '⚠️' : '✅';
    return `${icon} ${r.risk.toUpperCase()}\n${r.reason}`;
  } catch {
    return 'Could not analyse this message right now.';
  }
}

// ─── Channel send helpers (fetch-only, no SDKs) ──────────
export async function sendWhapiText(to: string, body: string): Promise<void> {
  const key = process.env.WHAPI_API_KEY;
  if (!key) return;
  await fetch('https://gate.whapi.cloud/messages/text', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ to, body }),
  }).catch(() => {});
}

export async function sendTelegram(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  }).catch(() => {});
}
