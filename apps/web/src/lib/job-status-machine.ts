import { allowedTransitions, canTransition as sharedCanTransition, isNoopTransition, type JobStatus } from '@ddots/shared';
import { STATUS_STYLES, statusLabel } from './job-status-display';

/**
 * Client-side view of the job status machine.
 *
 * A thin adapter over the shared machine in @ddots/shared rather than a second
 * copy of the rules: the server enforces those rules on every mutation, so a
 * divergent client table would offer transitions the API then rejects.
 *
 * Everything here is scoped to the admin policy — this module exists for the
 * admin UI. Employer-facing screens use the shared machine's default role.
 *
 * Note the statuses are the nine this system actually has. There is no
 * "approved" or "live": an approved job is `active`, which is also the live
 * (searchable) state.
 */

export type { JobStatus };

/** True if an admin may move `from` → `to`. */
export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return sharedCanTransition(from, to, 'admin');
}

/** Statuses an admin may move this job to. Never includes the current status. */
export function getAvailableTransitions(status: JobStatus): JobStatus[] {
  return allowedTransitions(status, 'admin');
}

/** A status with nowhere left to go — `archived` is terminal by design. */
export function isTerminal(status: JobStatus): boolean {
  return getAvailableTransitions(status).length === 0;
}

/** Re-applying the current status is a no-op, not an invalid transition. */
export { isNoopTransition, statusLabel };

/** Label + badge classes per status, for pickers and summaries. */
export const statusLabels = STATUS_STYLES;

/**
 * Why an admin might pick this transition — shown under each option so the
 * choice is obvious without knowing the internal vocabulary.
 */
const TRANSITION_HINTS: Partial<Record<JobStatus, string>> = {
  active: 'Publish and make searchable',
  pending: 'Send back to the moderation queue',
  rejected: 'Take down and tell the employer why',
  draft: 'Return to the employer for edits',
  paused: 'Temporarily hide without closing',
  filled: 'Position has been filled',
  expired: 'Age out of the listings',
  closed: 'Close without filling',
  archived: 'Archive permanently — this cannot be undone',
};

export function transitionHint(to: JobStatus): string | undefined {
  return TRANSITION_HINTS[to];
}

/** Transitions worth a second look before they are applied. */
export function isDestructive(to: JobStatus): boolean {
  return to === 'archived' || to === 'rejected';
}

/** Transitions where an explanation should be recorded. */
export function requiresReason(to: JobStatus): boolean {
  return to === 'rejected';
}
