/**
 * Pusher real-time triggers. Every call is a no-op (and never throws) when
 * Pusher is unconfigured — clients then fall back to polling.
 */
import Pusher from 'pusher';
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
