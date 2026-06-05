import { NextResponse } from 'next/server';
import { db, whatsappAdmins, whatsappBotLogs, eq, and } from '@ddots/db';
import { rateLimit } from '@ddots/api/lib/security';
import { handleBotMessage, handlePosterMessage, sendWhatsApp, UNAUTHORIZED_MESSAGE } from '@ddots/api/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WhapiMessage = {
  from?: string;
  from_me?: boolean;
  type?: string;
  text?: { body?: string };
  image?: { link?: string; mime_type?: string };
  document?: { link?: string; mime_type?: string };
};

export async function GET(): Promise<NextResponse> {
  return new NextResponse('ok', { status: 200 });
}

/**
 * Whapi.Cloud inbound webhook → admin job-posting bot.
 * Whapi posts JSON; replies are sent via the Whapi API (not in the response).
 * Always returns 200 to avoid Whapi retry loops.
 */
export async function POST(req: Request): Promise<NextResponse> {
  // Verify the channel token (Whapi sends it as a header or ?token= query).
  const expected = process.env.WHAPI_TOKEN;
  if (expected) {
    const provided = req.headers.get('x-whapi-token') ?? new URL(req.url).searchParams.get('token');
    if (provided !== expected) return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const body = (await req.json()) as { messages?: WhapiMessage[] };
    const messages = body.messages ?? [];

    for (const msg of messages) {
      if (msg.from_me) continue; // skip our own outgoing messages
      if (!msg.from) continue;
      const from = '+' + msg.from.replace('@s.whatsapp.net', '').replace('@c.us', '');

      const inboundPreview = msg.type === 'text' ? (msg.text?.body ?? '') : `[${msg.type ?? 'media'}]`;
      await db.insert(whatsappBotLogs).values({ phone: from, direction: 'in', message: inboundPreview }).catch(() => {});

      // Whitelist gate.
      const admin = await db.query.whatsappAdmins.findFirst({
        where: and(eq(whatsappAdmins.phone, from), eq(whatsappAdmins.isActive, true)),
      });
      if (!admin) {
        await sendWhatsApp(from, UNAUTHORIZED_MESSAGE);
        continue;
      }

      // Abuse + AI-cost protection.
      const rl = await rateLimit(`wa-bot:${from}`, 60, 3600);
      if (!rl.ok) {
        await sendWhatsApp(from, 'Too many messages this hour — please try again later.');
        continue;
      }

      let reply: string;
      if (msg.type === 'text') {
        reply = await handleBotMessage(from, (msg.text?.body ?? '').trim());
      } else if (msg.type === 'image') {
        reply = await handlePosterMessage(from, msg.image?.link, msg.image?.mime_type ?? 'image/jpeg');
      } else if (msg.type === 'document' && (msg.document?.mime_type ?? '').includes('pdf')) {
        reply = await handlePosterMessage(from, msg.document?.link, 'application/pdf');
      } else {
        reply = '⚠️ Only text messages and job posters (image/PDF) are supported.';
      }

      await sendWhatsApp(from, reply);
      await db.insert(whatsappBotLogs).values({ phone: from, direction: 'out', message: reply }).catch(() => {});
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[whapi webhook]', err);
    // Always 200 — Whapi retries on non-200.
    return new NextResponse('OK', { status: 200 });
  }
}
