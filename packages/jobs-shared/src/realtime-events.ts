/**
 * Real-time channel and event names.
 *
 * Shared because the publisher (packages/api) and the subscriber (the admin UI)
 * must agree exactly: a mismatched string fails silently — no error, just a
 * screen that never updates.
 */

/** Channel every admin session subscribes to. */
export const ADMIN_CHANNEL = 'admin';

/**
 * `job-pending` — a job was submitted and is waiting for review.
 * `job-changed` — a job's status changed, so another admin's list is stale.
 */
export const ADMIN_EVENTS = ['job-pending', 'job-changed'] as const;
export type AdminRealtimeEvent = (typeof ADMIN_EVENTS)[number];
