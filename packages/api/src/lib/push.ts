import webpush from 'web-push';
import { db, pushSubscriptions, eq } from '@ddots/db';

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:jobs@ddotsmediajobs.com', pub, priv);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body?: string; url?: string };

/** Send a web-push to all of a user's subscriptions. No-op without VAPID keys; prunes dead endpoints. */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const subs = await db.query.pushSubscriptions.findMany({ where: eq(pushSubscriptions.userId, userId) });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
      }
    }),
  );
}
