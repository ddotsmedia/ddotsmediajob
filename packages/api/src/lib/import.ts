import { z } from 'zod';
import { db, jobs, users, companies, notifications, eq } from '@ddots/db';
import { slugify, inferExperienceLevel } from '@ddots/shared';
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

// Job keywords in English + Arabic (مطلوب=required, وظيفة=job, شاغر=vacancy, راتب=salary).
const JOB_KEYWORDS = /hiring|vacanc|required|wanted|recruit|\bjobs?\b|positions?|urgently|walk[\s-]?in|salary|send\s+cv|candidate|مطلوب|وظيفة|شاغر|راتب|توظيف/i;

/** Quick keyword gate so we don't burn AI on non-job chatter. */
export function isJobMessage(text: string): boolean {
  return JOB_KEYWORDS.test(text);
}

// Validate the AI response before any DB write.
const draftSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    categorySlug: z.string().min(1).max(40),
    emirate: z.string().min(1).max(40),
    jobType: z.string().min(1).max(30),
  })
  .passthrough();

export type SavedDraft = { title: string; slug: string };

/** Extract a job from free text via Haiku and save a DRAFT (never auto-published). */
export async function extractAndSaveDraft(text: string, source: string, sourceMetadata?: Record<string, unknown>): Promise<SavedDraft | null> {
  // Arabic messages → Arabic-optimised prompt + Sonnet (better Arabic); else Haiku.
  const isArabic = detectLanguage(text) === 'ar';
  const draft = await structured<JobDraft>(
    isArabic ? SYSTEM_AR : SYSTEM,
    `${isArabic ? 'استخرج تفاصيل الوظيفة من النص التالي' : 'Extract the job posting from this message'}:\n\n${wrapUserContent(text)}`,
    JOB_DRAFT_TOOL,
    { model: isArabic ? MODEL_SMART : MODEL_FAST, maxTokens: 1800 },
  );
  draftSchema.parse(draft); // throws if the model returned junk

  const admin = await db.query.users.findFirst({ where: eq(users.role, 'admin') });
  if (!admin) return null;

  let companyId: string | null = null;
  if (draft.company?.trim()) {
    const slug = slugify(draft.company);
    const existing = await db.query.companies.findFirst({ where: eq(companies.slug, slug) });
    companyId = existing?.id ?? (await db.insert(companies).values({ slug, name: draft.company.trim(), industry: 'General' }).returning())[0]?.id ?? null;
  }

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
    salaryMin: draft.salaryMin || null,
    salaryMax: draft.salaryMax || null,
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
    status: 'draft',
    source,
    sourceMetadata,
    aiGenerated: true,
  });

  const admins = await db.query.users.findMany({ where: eq(users.role, 'admin'), columns: { id: true } });
  if (admins.length) {
    await db.insert(notifications).values(
      admins.map((a) => ({ userId: a.id, type: `${source}-import`, title: `New job draft from ${source}`, body: draft.title, link: '/admin/jobs/drafts' })),
    );
  }
  return { title: draft.title, slug: jobSlug };
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
