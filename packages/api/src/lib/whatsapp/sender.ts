/**
 * WhatsApp send via Whapi.Cloud REST API (no SDK).
 * Env: WHAPI_TOKEN, WHAPI_API_URL (e.g. https://gate.whapi.cloud).
 */
const API = () => process.env.WHAPI_API_URL ?? 'https://gate.whapi.cloud';

function chatId(to: string): string {
  const normalized = to.replace(/^\+/, '').replace(/[\s-]/g, '');
  return `${normalized}@s.whatsapp.net`;
}

/** Send a text message. Returns ok/error (never throws) so callers stay non-blocking. */
export async function sendWhatsApp(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHAPI_TOKEN;
  if (!token) return { ok: false, error: 'WHAPI_TOKEN not configured' };
  try {
    const res = await fetch(`${API()}/messages/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: chatId(to), body: message }),
    });
    if (!res.ok) {
      const error = await res.text();
      console.error('[Whapi] send failed', res.status, error);
      return { ok: false, error: `Whapi ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[Whapi] send error', err);
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}

/** Send an image by URL with optional caption. */
export async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHAPI_TOKEN;
  if (!token) return { ok: false, error: 'WHAPI_TOKEN not configured' };
  try {
    const res = await fetch(`${API()}/messages/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: chatId(to), media: imageUrl, caption: caption ?? '' }),
    });
    if (!res.ok) return { ok: false, error: `Whapi ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}
