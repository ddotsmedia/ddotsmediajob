import { lookup } from 'node:dns/promises';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import DOMPurify from 'isomorphic-dompurify';
import { TRPCError } from '@trpc/server';
import { getRedis } from './queue';

/**
 * HaveIBeenPwned breached-password check using k-anonymity (only a SHA-1
 * prefix leaves the server). Fail-open: if the API is unreachable, allow the
 * password rather than block registration.
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  try {
    const hash = createHash('sha1').update(password, 'utf-8').digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return false;
    const body = await res.text();
    return body.split('\n').some((line) => {
      const [hashSuffix, count] = line.trim().split(':');
      return hashSuffix === suffix && Number(count) > 0;
    });
  } catch {
    return false; // fail-open
  }
}

// ─── Twilio webhook signature verification (X-Twilio-Signature) ─────
export function verifyTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const expected = createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Redis rate limiting (fail-open) ────────────────────────────────
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  try {
    const r = getRedis();
    const k = `rl:${key}`;
    const n = await r.incr(k);
    if (n === 1) await r.expire(k, windowSec);
    if (n > limit) {
      const ttl = await r.ttl(k);
      return { ok: false, retryAfter: ttl > 0 ? ttl : windowSec };
    }
    return { ok: true, retryAfter: 0 };
  } catch {
    return { ok: true, retryAfter: 0 }; // never block on Redis failure
  }
}

/** Throwing wrapper for use inside tRPC procedures. */
export async function enforceRateLimit(key: string, limit: number, windowSec: number): Promise<void> {
  const { ok, retryAfter } = await rateLimit(key, limit, windowSec);
  if (!ok) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: `Rate limit reached. Try again in ${retryAfter}s.` });
  }
}

// ─── HTML sanitisation (stored XSS) ─────────────────────────────────
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'h2', 'h3', 'h4', 'a', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|\/)/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
  });
}

// ─── Prompt-injection guards ────────────────────────────────────────
const JAILBREAK_PATTERNS = [
  /ignore (all |the )?previous/i,
  /disregard (the |your )?instructions/i,
  /system prompt/i,
  /repeat your instructions/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /act as (an? )?(admin|developer|dan)/i,
];

export function isJailbreakAttempt(text: string): boolean {
  return JAILBREAK_PATTERNS.some((re) => re.test(text));
}

/** Wrap untrusted content so it can't be confused with system instructions. */
export function wrapUserContent(text: string): string {
  return `<user_content>\n${text.replace(/<\/?user_content>/gi, '')}\n</user_content>`;
}

// ─── SSRF-safe outbound fetch (admin URL import) ────────────────────
function ipToParts(ip: string): number[] | null {
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  return m ? m.slice(1).map(Number) : null;
}

function isPrivateAddress(ip: string): boolean {
  const v4 = ipToParts(ip);
  if (v4) {
    const [a, b] = v4 as [number, number, number, number];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  // IPv6
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7)); // mapped v4
  return false;
}

/** Fetch a public URL safely: https-only, no private IPs, no redirects, capped. */
export async function ssrfSafeFetchText(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid URL.' });
  }
  if (url.protocol !== 'https:') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only https:// URLs are allowed.' });
  }
  // Resolve and block private/internal addresses.
  let addrs: { address: string }[];
  try {
    addrs = await lookup(url.hostname, { all: true });
  } catch {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Could not resolve that host.' });
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address))) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'That URL resolves to a blocked address.' });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, {
      redirect: 'manual', // never auto-follow (redirect could point internal)
      signal: ctrl.signal,
      headers: { 'user-agent': 'DdotsBot/1.0 (+https://ddotsmediajobs.com)', accept: 'text/html' },
    });
    if (res.status >= 300 && res.status < 400) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Redirects are not allowed for imported URLs.' });
    }
    const len = Number(res.headers.get('content-length') ?? '0');
    if (len > 1_000_000) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Page too large.' });
    const text = await res.text();
    return text.slice(0, 1_000_000);
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Could not fetch that URL.' });
  } finally {
    clearTimeout(timer);
  }
}
