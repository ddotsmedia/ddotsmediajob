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

/** Default job lifetime — auto-expire this many days after posting. */
export const JOB_TTL_DAYS = 60;

/**
 * Expiry date for a newly-created job: posted + 60 days, or (for walk-ins) the day
 * after the walk-in window so the listing drops once the interview date has passed.
 */
export function jobExpiry(input?: { walkIn?: boolean | null; walkInLastDate?: string | null; walkInDate?: string | null }): Date {
  if (input?.walkIn) {
    const d = input.walkInLastDate || input.walkInDate;
    if (d) {
      const parsed = new Date(d);
      if (!Number.isNaN(parsed.getTime())) return new Date(parsed.getTime() + 86_400_000);
    }
  }
  return new Date(Date.now() + JOB_TTL_DAYS * 86_400_000);
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

/**
 * Readable slug: title-emirate-company (e.g. graphic-designer-sharjah-manarat).
 * No random suffix — appends -2, -3… only on collision. New jobs only.
 */
export async function generateJobSlug(title: string, emirate?: string | null, company?: string | null): Promise<string> {
  const parts = [
    slugify(title),
    // slugify first: callers may pass the emirate display name ("Abu Dhabi") not the slug,
    // and a raw space/uppercase here produces an un-findable slug → 404 on the job page.
    // Use the FULL emirate slug ("abu-dhabi", not just "abu") so slugs stay descriptive.
    emirate ? slugify(emirate) : null,
    company ? slugify(company).slice(0, 20) : null,
  ].filter(Boolean);
  const base = (parts.join('-').replace(/-+$/g, '').slice(0, 100) || 'job').replace(/-+$/g, '');
  for (let i = 1; i < 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const existing = await db.query.jobs.findFirst({ where: eq(jobs.slug, candidate), columns: { id: true } });
    if (!existing) return candidate.slice(0, 120);
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
