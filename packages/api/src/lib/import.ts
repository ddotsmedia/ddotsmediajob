import { z } from 'zod';
import { db, jobs, users, companies, notifications, eq, sql } from '@ddots/db';
import { slugify, inferExperienceLevel, JOB_TYPES } from '@ddots/shared';
import { generateJobSlug, jobExpiry } from './helpers';
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

// Job keywords across the UAE's main jobseeker languages: English, Arabic,
// Malayalam, Hindi, Tagalog and Urdu.
const JOB_KEYWORDS =
  /hiring|now hiring|vacanc|required|wanted|recruit|\bjobs?\b|job opening|positions?|position available|urgently|walk[\s-]?in|salary|send\s+(cv|resume)|whatsapp\s+cv|candidate|looking for|we\s+(are\s+)?(looking|need)|seeking|opening|opportunit(y|ies)|career opportunity|join our team|apply now|مطلوب|وظيفة|شاغر|راتب|توظيف|نبحث|فرصة\s*عمل|ആവശ്യമുണ്ട്|ജോലി|വേക്കൻസി|സാലറി|ഹയർ|നിയമനം|അവസരം|ഡ്രൈവർ|നഴ്സ്|അക്കൗണ്ടന്റ്|ജോലിക്ക്|പ്രവൃത്തി|चाहिए|नौकरी|वेकेंसी|सैलरी|ड्राइवर|नर्स|काम|हायरिंग|naghahanap|trabaho|sweldo|kailangan|\bdriver\b|\bnurse\b|درکار|نوکری|تنخواہ|ملازمت|چاہیے/i;

// Phone + salary-figure heuristic — many non-English posts skip explicit keywords.
const PHONE_RE = /(\+?\d[\d\s().\-]{7,}\d)/;
const SALARY_NUM_RE = /\b\d{3,6}\b/;

/** Quick gate so we don't burn AI on non-job chatter. Keyword OR phone+salary. */
export function isJobMessage(text: string): boolean {
  if (JOB_KEYWORDS.test(text)) return true;
  return PHONE_RE.test(text) && SALARY_NUM_RE.test(text);
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

// Map free-text emirate (slug / EN / AR) to a canonical slug. Empty → null (location unknown).
const EMIRATE_MAP: Record<string, string> = {
  dubai: 'dubai', دبي: 'dubai',
  'abu dhabi': 'abu-dhabi', 'abu-dhabi': 'abu-dhabi', abudhabi: 'abu-dhabi', أبوظبي: 'abu-dhabi', 'أبو ظبي': 'abu-dhabi',
  sharjah: 'sharjah', الشارقة: 'sharjah',
  ajman: 'ajman', عجمان: 'ajman',
  'ras al khaimah': 'ras-al-khaimah', 'ras-al-khaimah': 'ras-al-khaimah', rak: 'ras-al-khaimah', 'رأس الخيمة': 'ras-al-khaimah',
  fujairah: 'fujairah', الفجيرة: 'fujairah',
  'umm al quwain': 'umm-al-quwain', 'umm-al-quwain': 'umm-al-quwain', 'أم القيوين': 'umm-al-quwain',
};
// Keyword category detection — AI frequently over-defaults to 'it'. Used as a
// fallback when the model returns 'it' or nothing.
function detectCategory(text: string): string {
  const t = text.toLowerCase();
  if (/driver|driving|delivery|transport|logistics|chauffeur|سائق/.test(t)) return 'driving';
  if (/nurse|doctor|medical|hospital|pharmacy|healthcare|clinical|ممرض|طبيب/.test(t)) return 'healthcare';
  if (/accountant|finance|audit|tax|bookkeeping|accounting|محاسب/.test(t)) return 'finance';
  if (/sales|marketing|business development|retail|مبيعات/.test(t)) return 'sales';
  if (/construction|civil engineer|architect|site engineer|mason/.test(t)) return 'construction';
  if (/hotel|chef|cook|waiter|housekeeping|restaurant|hospitality/.test(t)) return 'hospitality';
  if (/teacher|tutor|trainer|lecturer|school|education|معلم/.test(t)) return 'education';
  if (/security|guard|safety|surveillance|حارس/.test(t)) return 'security';
  if (/software|developer|programmer|web developer|app developer|it support/.test(t)) return 'it';
  if (/beauty|salon|spa|makeup|hair|nail|aesthetics/.test(t)) return 'beauty';
  if (/manufacturing|factory|production|operator|technician|maintenance/.test(t)) return 'manufacturing';
  if (/\bhr\b|human resources|recruitment|talent acquisition|payroll/.test(t)) return 'admin';
  if (/admin|office|clerk|data entry|secretary|coordinator|typist|receptionist|مساعد/.test(t)) return 'admin';
  return 'general';
}

// First email address in free text (labelled or bare). Returns null if none.
const EMAIL_RE = /[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9.-]+\.[a-z]{2,}/i;
function extractEmail(text: string): string | null {
  const m = text.replace(/mailto:/gi, '').match(EMAIL_RE);
  return m ? m[0].toLowerCase() : null;
}

// First phone/WhatsApp number in free text (UAE/international). Returns digits or null.
function extractPhone(text: string): string | null {
  const m = text.match(/\+?\d[\d\s().-]{7,}\d/);
  return m ? m[0].replace(/[^\d+]/g, '') : null;
}

// Generic phrases that are NOT real job titles — skip them when deriving.
const NOT_TITLES = [
  'multiple vacancies', 'various positions', 'hiring now', 'urgent hiring', 'job vacancy',
  'now hiring', 'we are hiring', 'multiple positions', 'several vacancies', 'various openings',
  'job opportunity', 'career opportunity', 'job opening', 'immediate hiring', 'bulk hiring',
  'vacancies available', 'positions available', 'openings available', 'we are looking', 'urgent requirement',
];
const isNotTitle = (t: string) => NOT_TITLES.includes(t.toLowerCase().trim());
// ALL-CAPS multi-word → Title Case (leave normal-case as-is).
function fixCaps(t: string): string {
  if (t.split(/\s+/).length > 3 && t === t.toUpperCase()) {
    return t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return t;
}

// Best-effort job title from raw text when AI extraction fails entirely.
function deriveTitle(text: string): string {
  const clean = (s: string) =>
    s
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu, '') // emojis/symbols
      .replace(/[*_#`>•▪️●-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
      .trim();
  const candidates: string[] = [];
  // Labelled patterns first.
  const labelled = text.match(/(?:position|job title|post|vacancy|role|hiring|required|wanted)\s*[:\-—]\s*(.+)/i);
  if (labelled?.[1]) candidates.push(clean(labelled[1]));
  // Then each meaningful line in order.
  for (const l of text.split(/\r?\n/)) candidates.push(clean(l.trim()));
  // First candidate that is ≥3 chars and not a generic phrase.
  for (const c of candidates) {
    if (c.length >= 3 && !isNotTitle(c)) return fixCaps(c);
  }
  // Last resort: leading slice (even if generic — better than empty).
  return fixCaps(clean(text).slice(0, 60).trim());
}

function normalizeEmirate(raw: string | undefined | null): string | null {
  const key = (raw ?? '').toString().trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  if (!key) return null;
  return EMIRATE_MAP[key] ?? EMIRATE_MAP[key.replace(/ /g, '-')] ?? null;
}

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
      // AI over-defaults to 'it'; fall back to keyword detection when it returns 'it' or nothing.
      const aiCategory = d.categorySlug?.toString().trim().toLowerCase() || '';
      const finalCategory = aiCategory && aiCategory !== 'it' ? aiCategory : detectCategory(text);
      draft = {
        ...(raw as JobDraft),
        title: (d.title?.toString().trim() || 'Untitled Job').slice(0, 200),
        description: d.description?.toString().trim() || d.title?.toString().trim() || 'See original message for details.',
        categorySlug: finalCategory,
        emirate: normalizeEmirate(d.emirate as string | undefined) ?? 'dubai',
        jobType: (JOB_TYPES as readonly string[]).includes(String(d.jobType)) ? String(d.jobType) : DEFAULT_JOB_TYPE,
        company: (d.company as string | undefined)?.toString().trim() || '',
        // Optional booleans — default false when the model omits them.
        visaProvided: Boolean(d.visaProvided),
        accommodation: Boolean(d.accommodation),
        freshersWelcome: Boolean(d.freshersWelcome),
        remote: Boolean(d.remote),
        urgent: Boolean(d.urgent),
        freeZone: Boolean(d.freeZone),
      } as JobDraft;
    } catch (err) {
      aiError = err instanceof Error ? err.message : String(err);
      console.error('[import] all AI providers failed — saving raw fallback draft:', aiError);
    }

    // ── Last resort: never lose the message — save raw text as a draft ──
    if (!draft) {
      const slug = `whatsapp-import-${Math.random().toString(36).slice(2, 9)}`;
      const fallbackTitle = deriveTitle(text) || 'WhatsApp Import — Review Needed';
      await db.insert(jobs).values({
        slug,
        employerId: admin.id,
        companyId: null,
        title: fallbackTitle,
        description: text.slice(0, 8000),
        categorySlug: detectCategory(text),
        emirateSlug: normalizeEmirate(text) ?? 'dubai',
        jobType: DEFAULT_JOB_TYPE as never,
        contactWhatsapp: extractPhone(text) || null, // body only — never the sender number
        applyEmail: extractEmail(text),
        status: 'draft', // never auto-publish an unparsed message
        publishedAt: null,
        source,
        sourceMetadata: { ...(sourceMetadata ?? {}), rawText: text.slice(0, 4000), extractionStatus: 'failed', extractionError: aiError },
        aiGenerated: false,
      });
      await notifyAdmins(source, fallbackTitle);
      return { title: fallbackTitle, slug };
    }

    let companyId: string | null = null;
    if (draft.company?.trim()) {
      const slug = slugify(draft.company);
      const existing = await db.query.companies.findFirst({ where: eq(companies.slug, slug) });
      companyId = existing?.id ?? (await db.insert(companies).values({ slug, name: draft.company.trim(), industry: 'General' }).returning())[0]?.id ?? null;
    }

    // Negotiable salary if the source text says so (EN/AR) — clear any figure.
    const negotiable = /\bnegotiable\b|\bcompetitive\b|salary\s*tbd|to\s+be\s+(discussed|decided)|راتب\s*مفاوض|قابل\s*للتفاوض/i.test(text);

    const jobSlug = await generateJobSlug(draft.title, draft.emirate, draft.company);
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
      // Contact number from the post body only — NEVER the sender's number (kept in sourceMetadata).
      contactWhatsapp: draft.contactWhatsapp || extractPhone(text) || null,
      applyEmail: draft.contactEmail || extractEmail(text),
      status: opts?.autoPublish ? 'active' : 'draft',
      publishedAt: opts?.autoPublish ? new Date() : null,
      expiresAt: jobExpiry(),
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
