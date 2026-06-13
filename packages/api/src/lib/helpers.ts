import { db, jobs, auditLogs, notifications, eq, and, lt, sql } from '@ddots/db';
import { slugify } from '@ddots/shared';
import { pushToUser } from './realtime';

/** Create an in-app notification for a user (best-effort) + real-time ping when configured. */
export async function notify(
  userId: string,
  type: string,
  title: string,
  opts?: { body?: string; link?: string },
): Promise<void> {
  try {
    await db.insert(notifications).values({ userId, type, title, body: opts?.body, link: opts?.link });
    void pushToUser(userId, 'notification', { type, title });
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

/** Flip active jobs whose expiry has passed to `expired` and notify their owners. Idempotent. */
export async function expireStaleJobs(): Promise<number> {
  const stale = await db
    .update(jobs)
    .set({ status: 'expired' })
    .where(and(eq(jobs.status, 'active'), sql`${jobs.expiresAt} IS NOT NULL`, lt(jobs.expiresAt, sql`now()`)))
    .returning({ id: jobs.id, title: jobs.title, employerId: jobs.employerId });

  for (const j of stale) {
    if (j.employerId) {
      await notify(j.employerId, 'job.expired', 'Your job posting expired', {
        body: `“${j.title}” has reached its expiry date and is no longer listed. Renew it to relist.`,
        link: '/employer/jobs',
      });
    }
  }
  return stale.length;
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
