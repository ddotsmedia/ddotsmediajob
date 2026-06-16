import { db, whapiSettings } from '@ddots/db';
import { cached } from './security';
import { getRedis } from './queue';

export type WhapiSettings = {
  minTextLength: number;
  requireSalary: boolean;
  requireContact: boolean;
  requireLocation: boolean;
  allowedGroups: string[];
  blockedNumbers: string[];
  blockedKeywords: string[];
  customKeywords: string[];
  blockOwnMessages: boolean;
  autoPublish: boolean;
  replyOnSuccess: boolean;
  replyOnSkip: boolean;
  successMessage: string | null;
  skipMessage: string | null;
};

export const DEFAULT_WHAPI_SETTINGS: WhapiSettings = {
  minTextLength: 30,
  requireSalary: false,
  requireContact: false,
  requireLocation: false,
  allowedGroups: [],
  blockedNumbers: [],
  blockedKeywords: [],
  customKeywords: [],
  blockOwnMessages: true,
  autoPublish: false,
  replyOnSuccess: true,
  replyOnSkip: false,
  successMessage: '✅ Job draft created! Review: https://ddotsmediajobs.com/admin/jobs/drafts',
  skipMessage: null,
};

const CACHE_KEY = 'whapi:settings';

/** Load the single whapi_settings row (Redis-cached 5 min, fail-open to defaults). */
export async function getWhapiSettings(): Promise<WhapiSettings> {
  return cached(CACHE_KEY, 300, async () => {
    const row = await db.query.whapiSettings.findFirst();
    if (!row) return DEFAULT_WHAPI_SETTINGS;
    return {
      minTextLength: row.minTextLength,
      requireSalary: row.requireSalary,
      requireContact: row.requireContact,
      requireLocation: row.requireLocation,
      allowedGroups: row.allowedGroups ?? [],
      blockedNumbers: row.blockedNumbers ?? [],
      blockedKeywords: row.blockedKeywords ?? [],
      customKeywords: row.customKeywords ?? [],
      blockOwnMessages: row.blockOwnMessages,
      autoPublish: row.autoPublish,
      replyOnSuccess: row.replyOnSuccess,
      replyOnSkip: row.replyOnSkip,
      successMessage: row.successMessage,
      skipMessage: row.skipMessage,
    };
  });
}

/** Drop the cached settings (call after an admin update). */
export async function invalidateWhapiSettings(): Promise<void> {
  try {
    await getRedis().del(`cache:${CACHE_KEY}`);
  } catch {
    /* fail-open */
  }
}

// ── Field-presence detectors ─────────────────────────────
export function hasSalaryMention(text: string): boolean {
  return /\b(aed|dhs?|dirhams?|salary|wage|pay(check)?|monthly|per month)\b|راتب|درهم|\d[\d,]{3,}/i.test(text);
}
export function hasContactMention(text: string): boolean {
  return /\+?\d[\d\s().-]{7,}\d|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|whatsapp|wa\.me|\bcall\b|\bcontact\b|\bcv\b|اتصل|واتساب/i.test(text);
}
export function hasLocationMention(text: string): boolean {
  return /\b(dubai|abu\s*dhabi|sharjah|ajman|fujairah|ras\s*al\s*khaimah|rak|umm\s*al\s*quwain|uae|u\.a\.e|emirate|deira|bur\s*dubai|jlt|marina|jebel\s*ali)\b|دبي|أبوظبي|الشارقة|عجمان|الإمارات/i.test(text);
}

export type SkipReason =
  | 'too_short'
  | 'blocked_keyword'
  | 'no_job_keyword'
  | 'blocked_number'
  | 'not_allowed_group'
  | 'missing_salary'
  | 'missing_contact'
  | 'missing_location';

export type CriteriaResult = { ok: boolean; reason?: SkipReason; detail?: string };

const norm = (s: string) => s.toLowerCase();

/**
 * Apply all configured criteria in order. `isJobKeyword` is injected so the
 * caller supplies the base JOB_KEYWORDS test (avoids a circular import).
 */
export function evaluateCriteria(
  text: string,
  opts: { from?: string; chatId?: string; isJobKeyword: (t: string) => boolean },
  s: WhapiSettings,
): CriteriaResult {
  const t = text.trim();
  const lower = norm(t);

  if (t.length < s.minTextLength) return { ok: false, reason: 'too_short', detail: `${t.length} < ${s.minTextLength} chars` };

  const blocked = s.blockedKeywords.find((k) => k && lower.includes(norm(k)));
  if (blocked) return { ok: false, reason: 'blocked_keyword', detail: blocked };

  const customHit = s.customKeywords.some((k) => k && lower.includes(norm(k)));
  if (!opts.isJobKeyword(t) && !customHit) return { ok: false, reason: 'no_job_keyword' };

  if (opts.from && s.blockedNumbers.some((n) => n && opts.from!.includes(n.replace(/\D/g, '')))) {
    return { ok: false, reason: 'blocked_number', detail: opts.from };
  }

  if (s.allowedGroups.length > 0 && !(opts.chatId && s.allowedGroups.includes(opts.chatId))) {
    return { ok: false, reason: 'not_allowed_group', detail: opts.chatId ?? '(none)' };
  }

  if (s.requireSalary && !hasSalaryMention(t)) return { ok: false, reason: 'missing_salary' };
  if (s.requireContact && !hasContactMention(t)) return { ok: false, reason: 'missing_contact' };
  if (s.requireLocation && !hasLocationMention(t)) return { ok: false, reason: 'missing_location' };

  return { ok: true };
}

export const SKIP_LABEL: Record<SkipReason, string> = {
  too_short: 'Message too short',
  blocked_keyword: 'Contains a blocked keyword',
  no_job_keyword: 'No job keyword matched',
  blocked_number: 'Sender number is blocked',
  not_allowed_group: 'Not from an allowed group',
  missing_salary: 'No salary mentioned',
  missing_contact: 'No contact (phone/email) mentioned',
  missing_location: 'No location/emirate mentioned',
};
