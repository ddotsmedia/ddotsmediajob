import type { JobStatus } from './constants';

/**
 * Deterministic job lifecycle transitions (audit Phase 5A). Pure — no DB, no AI.
 *
 * Two policies, because the two actors have genuinely different powers:
 *
 * - `employer` — what a job's owner may do to their own listing:
 *   DRAFT → ACTIVE → PAUSED ⇄ ACTIVE → FILLED; ANY → ARCHIVED (terminal).
 *   An employer can never approve or reject their own job.
 *
 * - `admin` — the moderation lifecycle on top of that: approve (pending →
 *   active), reject, send back for edits, relist an expired job, take a live
 *   job down. These are exactly the moves the employer policy forbids, which is
 *   why admin routes cannot simply reuse the employer map.
 *
 * ARCHIVED is terminal under both policies — archiving stays irreversible.
 */
export type ActorRole = 'employer' | 'admin';

const EMPLOYER_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ['active', 'archived'],
  pending: ['active', 'archived'],
  active: ['paused', 'filled', 'archived'],
  paused: ['active', 'filled', 'archived'],
  filled: ['archived'],
  expired: ['active', 'archived'],
  closed: ['archived'],
  rejected: ['archived'],
  archived: [], // terminal — archiving is irreversible
};

const ADMIN_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ['pending', 'active', 'rejected', 'archived'],
  // The moderation queue: approve, reject, or send back for edits.
  pending: ['active', 'rejected', 'draft', 'archived'],
  // A live job can be taken down, paused, filled, or aged out.
  active: ['paused', 'filled', 'expired', 'closed', 'rejected', 'archived'],
  paused: ['active', 'filled', 'closed', 'archived'],
  filled: ['active', 'closed', 'archived'],
  expired: ['active', 'closed', 'archived'], // relist
  closed: ['active', 'archived'], // reopen
  rejected: ['pending', 'active', 'archived'], // re-review after the employer fixes it
  archived: [],
};

const POLICIES: Record<ActorRole, Record<JobStatus, JobStatus[]>> = {
  employer: EMPLOYER_TRANSITIONS,
  admin: ADMIN_TRANSITIONS,
};

/**
 * True if moving `current` → `target` is permitted for this actor.
 *
 * Defaults to the employer policy so existing employer call sites keep their
 * exact behaviour; admin routes must opt in explicitly.
 */
export function canTransition(current: JobStatus, target: JobStatus, role: ActorRole = 'employer'): boolean {
  return POLICIES[role][current]?.includes(target) ?? false;
}

/** Target statuses this actor may move `current` to. Never includes `current` itself. */
export function allowedTransitions(current: JobStatus, role: ActorRole = 'employer'): JobStatus[] {
  return POLICIES[role][current] ?? [];
}

/**
 * Re-applying the status a job already has. Callers should treat this as a
 * no-op rather than an invalid transition — re-selecting the current value in a
 * dropdown shouldn't raise an error.
 */
export function isNoopTransition(current: JobStatus, target: JobStatus): boolean {
  return current === target;
}

/** Which timestamp column to stamp for a target status (null if none). */
export function timestampFieldFor(target: JobStatus): 'pausedAt' | 'filledAt' | 'archivedAt' | null {
  if (target === 'paused') return 'pausedAt';
  if (target === 'filled') return 'filledAt';
  if (target === 'archived') return 'archivedAt';
  return null;
}
