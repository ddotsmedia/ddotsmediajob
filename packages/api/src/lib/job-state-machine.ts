import type { JobStatus } from '@ddots/shared';

/**
 * Deterministic job lifecycle transitions (audit Phase 5A). Pure — no DB, no AI.
 * Employer-facing lifecycle: DRAFT → ACTIVE → PAUSED ⇄ ACTIVE → FILLED; ANY → ARCHIVED (terminal).
 * Also tolerates the moderation/cron statuses (pending/expired/closed/rejected) so callers
 * never crash on an unexpected current state.
 */
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
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

/** True if moving `current` → `target` is a permitted lifecycle transition. */
export function canTransition(current: JobStatus, target: JobStatus): boolean {
  return TRANSITIONS[current]?.includes(target) ?? false;
}

/** Which timestamp column to stamp for a target status (null if none). */
export function timestampFieldFor(target: JobStatus): 'pausedAt' | 'filledAt' | 'archivedAt' | null {
  if (target === 'paused') return 'pausedAt';
  if (target === 'filled') return 'filledAt';
  if (target === 'archived') return 'archivedAt';
  return null;
}
