import { NextResponse } from 'next/server';
import { db, whatsappAdmins, whatsappBotLogs, eq, and } from '@ddots/db';
import { verifyTwilioSignature, rateLimit } from '@ddots/api/lib/security';
import { handleBotMessage, UNAUTHORIZED_MESSAGE } from '@ddots/api/lib/whatsapp';
import { SITE } from '@ddots/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function twiml(message: string): NextResponse {
  const esc = message.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc}</Message></Response>`, {
    status: 200,
    headers: { 'content-type': 'text/xml' },
  });
}

const empty = () =>
  new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { 'content-type': 'text/xml' },
  });

export async function GET(): Promise<NextResponse> {
  return new NextResponse('ok', { status: 200 });
}

/** Twilio WhatsApp inbound webhook → admin job-posting bot. Always returns 200 (TwiML) to avoid Twilio retries. */
export async function POST(req: Request): Promise<NextResponse> {
  let from = 'unknown';
  let body = '';
  try {
    const form = await req.formData();
    const params: Record<string, string> = {};
    form.forEach((v, k) => (params[k] = String(v)));
    from = String(form.get('From') ?? '').replace('whatsapp:', '').trim();
    body = String(form.get('Body') ?? '').trim();

    // Verify Twilio signature when configured (reject spoofed requests).
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const url = `${SITE.url}${new URL(req.url).pathname}`;
      if (!verifyTwilioSignature(authToken, req.headers.get('x-twilio-signature'), url, params)) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }
  } catch {
    return empty();
  }

  if (!from) return empty();

  try {
    // Whitelist: only active admins may use the bot.
    const admin = await db.query.whatsappAdmins.findFirst({
      where: and(eq(whatsappAdmins.phone, from), eq(whatsappAdmins.isActive, true)),
    });
    if (!admin) {
      await db.insert(whatsappBotLogs).values({ phone: from, direction: 'in', message: body }).catch(() => {});
      return twiml(UNAUTHORIZED_MESSAGE);
    }

    // Abuse + AI cost protection.
    const rl = await rateLimit(`wa-bot:${from}`, 60, 3600);
    if (!rl.ok) return twiml('Too many messages this hour — please try again later.');

    await db.insert(whatsappBotLogs).values({ phone: from, direction: 'in', message: body }).catch(() => {});

    const reply = await handleBotMessage(from, body);

    await db.insert(whatsappBotLogs).values({ phone: from, direction: 'out', message: reply }).catch(() => {});
    return twiml(reply);
  } catch (err) {
    console.error('[wa webhook]', err);
    return twiml('⚠️ Something went wrong. Please try again.');
  }
}
