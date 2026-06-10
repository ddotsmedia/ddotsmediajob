import { NextResponse } from 'next/server';
import { SITE } from '@ddots/shared';

/** Register the Telegram webhook (called from the admin UI). */
export async function POST() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 400 });
  const secret = process.env.TELEGRAM_SECRET ?? '';
  const url = `${SITE.url}/api/telegram/webhook?secret_token=${encodeURIComponent(secret)}`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, secret_token: secret || undefined, allowed_updates: ['message'] }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  return NextResponse.json({ ok: Boolean(data.ok), description: data.description ?? null, webhook: url });
}

/** Webhook status. */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, configured: false });
  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = (await res.json().catch(() => ({}))) as { result?: { url?: string } };
  return NextResponse.json({ ok: true, configured: Boolean(data.result?.url), url: data.result?.url ?? null });
}
