import { db, jobs, whatsappBotSessions, whatsappBotLogs, eq, and, desc, count } from '@ddots/db';
import { SITE, EMIRATE_SLUGS } from '@ddots/shared';
import { parseJobMessage, type ParsedJob } from './parser';
import { createJobFromWhatsApp } from './createJob';
import { HELP_MESSAGE, ERROR_MESSAGE, confirmationMessage, successMessage } from './messages';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? SITE.url;
const YES = new Set(['yes', 'y', 'post']);
const NO = new Set(['no', 'n', 'cancel']);

const EMIRATE_ALIASES: Record<string, string> = {
  dxb: 'dubai', auh: 'abu-dhabi', 'abu dhabi': 'abu-dhabi', abudhabi: 'abu-dhabi',
  shj: 'sharjah', rak: 'ras-al-khaimah', 'ras al khaimah': 'ras-al-khaimah',
  uaq: 'umm-al-quwain', 'umm al quwain': 'umm-al-quwain',
};
function toEmirateSlug(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  const dashed = v.replace(/\s+/g, '-');
  if ((EMIRATE_SLUGS as readonly string[]).includes(dashed)) return dashed;
  return EMIRATE_ALIASES[v] ?? null;
}
function parseSalary(raw: string): { min: number | null; max: number | null } {
  const nums = raw.replace(/,/g, '').match(/\d+(?:\.\d+)?k?/gi)?.map((n) => {
    const k = /k$/i.test(n);
    return Math.round(parseFloat(n) * (k ? 1000 : 1));
  });
  if (!nums || !nums.length) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0]!, max: nums[0]! };
  return { min: Math.min(nums[0]!, nums[1]!), max: Math.max(nums[0]!, nums[1]!) };
}
function parseBool(raw: string): boolean {
  return /^(y|yes|true|1|provided)/i.test(raw.trim());
}

const CORRECTION_KEYS = ['title', 'emirate', 'salary', 'visa', 'accom', 'accommodation', 'contact', 'company', 'type', 'category', 'urgent', 'description'];

/** Apply one "key: value" correction to a draft. Returns true if a known field was updated. */
function applyCorrection(draft: ParsedJob, line: string): boolean {
  const m = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.+)$/);
  if (!m) return false;
  const key = m[1]!.toLowerCase();
  const val = m[2]!.trim();
  if (!CORRECTION_KEYS.includes(key)) return false;
  switch (key) {
    case 'title': draft.title = val; break;
    case 'company': draft.company = val; break;
    case 'emirate': { const s = toEmirateSlug(val); if (s) draft.emirate = s; break; }
    case 'salary': { const { min, max } = parseSalary(val); draft.salary_min = min; draft.salary_max = max; break; }
    case 'visa': draft.visa_provided = parseBool(val); break;
    case 'accom': case 'accommodation': draft.accommodation = parseBool(val); break;
    case 'contact': draft.contact_whatsapp = val; break;
    case 'type': draft.job_type = val.toLowerCase().replace(/\s+/g, '-'); break;
    case 'category': draft.category = val.toLowerCase(); break;
    case 'urgent': draft.urgent = parseBool(val); break;
    case 'description': draft.description = val; break;
  }
  return true;
}

/** Does this message look like one or more field corrections? */
function isCorrection(message: string): boolean {
  return message.split('\n').some((l) => {
    const m = l.match(/^\s*([a-zA-Z]+)\s*:/);
    return m ? CORRECTION_KEYS.includes(m[1]!.toLowerCase()) : false;
  });
}

async function getSession(phone: string) {
  const existing = await db.query.whatsappBotSessions.findFirst({ where: eq(whatsappBotSessions.phone, phone) });
  if (existing) return existing;
  const [created] = await db.insert(whatsappBotSessions).values({ phone, state: 'idle', draft: {} }).returning();
  return created!;
}

async function setSession(phone: string, state: string, draft: Record<string, unknown>) {
  await db
    .update(whatsappBotSessions)
    .set({ state, draft, lastActivity: new Date() })
    .where(eq(whatsappBotSessions.phone, phone));
}

async function statusCommand(phone: string): Promise<string> {
  const rows = await db
    .select({ title: jobs.title, slug: jobs.slug, emirate: jobs.emirateSlug, status: jobs.status })
    .from(whatsappBotLogs)
    .innerJoin(jobs, eq(whatsappBotLogs.jobId, jobs.id))
    .where(eq(whatsappBotLogs.phone, phone))
    .orderBy(desc(whatsappBotLogs.createdAt))
    .limit(5);
  if (!rows.length) return 'No posts yet from this number. Send a job to get started!';
  return rows.map((r) => `✅ ${r.title} — ${r.emirate} — ${r.status}\n${BASE}/jobs/${r.slug}`).join('\n\n');
}

async function listCommand(): Promise<string> {
  const [row] = await db.select({ v: count() }).from(jobs).where(eq(jobs.status, 'active'));
  return `📊 DdotsMediaJobs currently has ${row?.v ?? 0} active job listings.`;
}

/** Main bot brain. Returns the reply text to send back to the admin. */
export async function handleBotMessage(phone: string, message: string): Promise<string> {
  const text = message.trim();
  const lower = text.toLowerCase();

  // Commands — checked first, regardless of state.
  if (['help', 'hi', 'hello', 'menu'].includes(lower)) {
    await setSession(phone, 'idle', {});
    return HELP_MESSAGE;
  }
  if (lower === 'cancel') {
    await setSession(phone, 'idle', {});
    return "❌ Cancelled. Send 'help' to start again.";
  }
  if (lower === 'status') return statusCommand(phone);
  if (lower === 'list') return listCommand();

  const session = await getSession(phone);

  if (session.state === 'awaiting_confirm') {
    const draft = session.draft as unknown as ParsedJob;

    if (YES.has(lower)) {
      try {
        const { slug } = await createJobFromWhatsApp(draft, phone);
        await setSession(phone, 'idle', {});
        return successMessage(draft, slug);
      } catch (err) {
        console.error('[wa bot] create failed', err);
        return ERROR_MESSAGE;
      }
    }
    if (NO.has(lower)) {
      await setSession(phone, 'idle', {});
      return '❌ Cancelled. Send a new job anytime.';
    }
    if (isCorrection(text)) {
      let changed = false;
      for (const line of text.split('\n')) changed = applyCorrection(draft, line) || changed;
      if (changed) {
        await setSession(phone, 'awaiting_confirm', draft as unknown as Record<string, unknown>);
        return `${confirmationMessage(draft)}\n\nReply *yes* to post.`;
      }
    }
    // Maybe a brand-new job message.
    const fresh = await parseJobMessage(text);
    if (fresh) {
      await setSession(phone, 'awaiting_confirm', fresh as unknown as Record<string, unknown>);
      return confirmationMessage(fresh);
    }
    return 'Reply *yes* to post or *no* to cancel.';
  }

  // idle: try to parse a job.
  const parsed = await parseJobMessage(text);
  if (!parsed) return HELP_MESSAGE;
  await setSession(phone, 'awaiting_confirm', parsed as unknown as Record<string, unknown>);
  return confirmationMessage(parsed);
}
