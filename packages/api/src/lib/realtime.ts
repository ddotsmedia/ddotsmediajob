/**
 * Pusher real-time triggers. Every call is a no-op (and never throws) when
 * Pusher is unconfigured — clients then fall back to polling.
 */
import Pusher from 'pusher';
import { ADMIN_CHANNEL, type AdminRealtimeEvent } from '@ddots/shared';
import { isRealtimeConfigured } from './integrations';

export { isRealtimeConfigured };

let client: Pusher | null = null;
function getPusher(): Pusher | null {
  if (!isRealtimeConfigured()) return null;
  if (client) return client;
  client = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER ?? 'ap2',
    useTLS: true,
  });
  return client;
}

export type RealtimeEvent = 'notification' | 'new-application' | 'job-approved' | 'new-message' | 'alert-match';

// Channel/event names live in @ddots/shared so the admin UI subscribes to
// exactly what this file publishes — a mismatch fails silently.
export { ADMIN_CHANNEL, ADMIN_EVENTS, type AdminRealtimeEvent } from '@ddots/shared';

/** Fire an event to a user's channel (user-{userId}). Best-effort, never throws. */
export async function pushToUser(
  userId: string,
  event: RealtimeEvent,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const p = getPusher();
  if (!p) return;
  try {
    await p.trigger(`user-${userId}`, event, payload);
  } catch (err) {
    console.error('[realtime] trigger failed:', err instanceof Error ? err.message : err);
  }
}

/**
 * Broadcast to every admin session. Best-effort and never throws — when Pusher
 * is unconfigured this is a no-op and the admin screens keep their normal
 * refetching, so nothing breaks without credentials.
 *
 * Payloads carry only what a list needs to react (id, title, status). Nothing
 * sensitive: this channel is not access-controlled on the client.
 */
export async function pushToAdmins(
  event: AdminRealtimeEvent,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const p = getPusher();
  if (!p) return;
  try {
    await p.trigger(ADMIN_CHANNEL, event, payload);
  } catch (err) {
    console.error('[realtime] admin trigger failed:', err instanceof Error ? err.message : err);
  }
}
