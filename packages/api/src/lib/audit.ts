import { db, auditLogs } from '@ddots/db';
import { clientIp, clientUserAgent, diffFields, snapshot } from './audit-diff';
import type { AuditCtx, AuditChange } from './audit-diff';

/**
 * Audit logging. Every admin mutation records who did what, when, from where,
 * and — where existing state changed — a field-level before/after diff.
 *
 * Entries are append-only: nothing in this codebase deletes from audit_logs.
 */

export * from './audit-diff';

/**
 * Record an admin action. Best-effort: a logging failure must never fail the
 * mutation that triggered it, so errors are swallowed after being reported.
 *
 * @param changes Row snapshots. Both sides → a field-level diff. `before` only
 *   (a delete) or `after` only (a create) → the full row is stored instead,
 *   since a delete is irreversible and the row is gone afterwards.
 */
export async function audit(
  ctx: AuditCtx | undefined,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
  changes?: AuditChange,
): Promise<void> {
  try {
    const actorId = ctx?.actorId ?? ctx?.session?.user?.id ?? null;
    const payload: Record<string, unknown> = { ...meta };

    if (changes?.before && changes.after) {
      const diff = diffFields(changes.before, changes.after);
      if (Object.keys(diff).length > 0) payload.changes = diff;
    } else if (changes?.before) {
      payload.deleted = snapshot(changes.before);
    } else if (changes?.after) {
      payload.created = snapshot(changes.after);
    }

    await db.insert(auditLogs).values({
      actorId,
      action,
      entity,
      entityId,
      meta: Object.keys(payload).length > 0 ? payload : null,
      ip: clientIp(ctx?.headers),
      userAgent: clientUserAgent(ctx?.headers),
    });
  } catch (err) {
    console.error('[audit] failed', err);
  }
}
