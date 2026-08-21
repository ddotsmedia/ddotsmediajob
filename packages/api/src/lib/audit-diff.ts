/**
 * Pure audit helpers — diffing, redaction and request metadata extraction.
 *
 * Deliberately free of any database import so this logic is unit-testable
 * without a live connection; ./audit adds the persistence layer on top.
 */

/**
 * The slice of the tRPC context audit needs. Kept structural rather than
 * importing Context so workers and webhook handlers can log too.
 */
export type AuditCtx = {
  session?: { user?: { id?: string | null } | null } | null;
  headers?: Headers;
  /** Overrides the session actor — registration/onboarding run before a session exists. */
  actorId?: string | null;
};

/** Row state either side of a mutation. Pass the whole row; the diff is computed here. */
export type AuditChange = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

/** One changed field, as stored in meta.changes. */
export type FieldDiff = { from: unknown; to: unknown };

/**
 * Never persist these into an admin-readable log, even if a caller passes a
 * whole user row. Matched case-insensitively against the field name.
 */
const REDACTED = [
  'password',
  'passwordhash',
  'totpsecret',
  'twofactorsecret',
  'backupcodes',
  'resettoken',
  'verificationtoken',
  'sessiontoken',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'secret',
];

/** Fields that change on every write and carry no audit value. */
const IGNORED = ['updatedat', 'updated_at'];

const MAX_UA = 512;
const MAX_VALUE_CHARS = 500;
const MAX_CHANGED_FIELDS = 40;

const isRedacted = (key: string) => REDACTED.some((r) => key.toLowerCase().includes(r));
const isIgnored = (key: string) => IGNORED.includes(key.toLowerCase());

/** First hop in x-forwarded-for is the client; falls back to x-real-ip behind Nginx. */
export function clientIp(headers?: Headers): string | null {
  if (!headers) return null;
  const fwd = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (fwd) return fwd.slice(0, 64);
  return headers.get('x-real-ip')?.trim().slice(0, 64) || null;
}

export function clientUserAgent(headers?: Headers): string | null {
  return headers?.get('user-agent')?.slice(0, MAX_UA) || null;
}

/** Dates and objects compare by value, not identity, so no-op writes stay out of the log. */
function normalise(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  return v;
}

function comparable(v: unknown): string {
  const n = normalise(v);
  return typeof n === 'object' && n !== null ? JSON.stringify(n) : String(n);
}

/** Truncate long values so one blob field can't bloat every audit row. */
function summarise(v: unknown): unknown {
  const n = normalise(v);
  if (typeof n === 'string' && n.length > MAX_VALUE_CHARS) return `${n.slice(0, MAX_VALUE_CHARS)}… (${n.length} chars)`;
  if (typeof n === 'object' && n !== null) {
    const json = JSON.stringify(n);
    if (json.length > MAX_VALUE_CHARS) return `${json.slice(0, MAX_VALUE_CHARS)}… (${json.length} chars)`;
  }
  return n;
}

/**
 * Field-level diff of two row snapshots — only keys whose value actually
 * changed. Returns an empty object when nothing changed, so a no-op update
 * logs the action without a misleading "changes" block.
 */
export function diffFields(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
): Record<string, FieldDiff> {
  if (!before || !after) return {};
  const out: Record<string, FieldDiff> = {};
  let count = 0;

  for (const key of Object.keys(after)) {
    if (isIgnored(key)) continue;
    if (!(key in before)) continue;
    if (comparable(before[key]) === comparable(after[key])) continue;

    if (count >= MAX_CHANGED_FIELDS) {
      out['…'] = { from: null, to: `${Object.keys(after).length - count} more field(s) not recorded` };
      break;
    }
    out[key] = isRedacted(key)
      ? { from: '[redacted]', to: '[redacted]' }
      : { from: summarise(before[key]), to: summarise(after[key]) };
    count++;
  }
  return out;
}

/**
 * Whole-row snapshot with the same redaction and truncation rules as a diff.
 * Used for creates and deletes, where there is only one side to record.
 */
export function snapshot(row?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    if (isIgnored(key)) continue;
    out[key] = isRedacted(key) ? '[redacted]' : summarise(row[key]);
  }
  return out;
}

