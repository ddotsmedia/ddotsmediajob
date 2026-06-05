/**
 * Programmatic WhatsApp send via the Twilio REST API (no SDK dependency).
 * The webhook replies inline with TwiML; use this only for out-of-band/async sends.
 */
export async function sendWhatsApp(to: string, message: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) return { ok: false, error: 'Twilio env not configured' };

  const body = new URLSearchParams({
    From: from, // e.g. "whatsapp:+14155238886"
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    Body: message,
  });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) return { ok: false, error: `Twilio ${res.status}` };
    const json = (await res.json()) as { sid?: string };
    return { ok: true, sid: json.sid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}
