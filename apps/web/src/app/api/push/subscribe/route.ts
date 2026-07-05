import { NextResponse } from 'next/server';
import { auth } from '@ddots/auth';
import { db, pushSubscriptions } from '@ddots/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } };

/**
 * Store a Web Push subscription for the logged-in user (foundation — sending is wired later
 * with job alerts). The push_subscriptions table requires a userId, so auth is required.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: 'auth required' }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const sub = body.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const authKey = sub?.keys?.auth;
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ ok: false, error: 'invalid subscription' }, { status: 400 });
  }

  // Idempotent: a re-subscribe from the same endpoint re-points it at the current user.
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh, auth: authKey })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh, auth: authKey } });

  return NextResponse.json({ ok: true });
}
