import { db, jobs, auditLogs, notifications, eq } from '@ddots/db';
import { slugify } from '@ddots/shared';

/** Create an in-app notification for a user (best-effort). */
export async function notify(
  userId: string,
  type: string,
  title: string,
  opts?: { body?: string; link?: string },
): Promise<void> {
  try {
    await db.insert(notifications).values({ userId, type, title, body: opts?.body, link: opts?.link });
  } catch (err) {
    console.error('[notify] failed', err);
  }
}

/** Generate a slug unique within the jobs table by appending a short suffix. */
export async function uniqueJobSlug(title: string): Promise<string> {
  const base = slugify(title) || 'job';
  for (let i = 0; i < 5; i++) {
    const suffix = i === 0 ? '' : `-${Math.random().toString(36).slice(2, 6)}`;
    const candidate = `${base}${suffix}`.slice(0, 120);
    const existing = await db.query.jobs.findFirst({ where: eq(jobs.slug, candidate) });
    if (!existing) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 120);
}

export async function audit(
  actorId: string | undefined,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({ actorId: actorId ?? null, action, entity, entityId, meta });
  } catch (err) {
    console.error('[audit] failed', err);
  }
}
