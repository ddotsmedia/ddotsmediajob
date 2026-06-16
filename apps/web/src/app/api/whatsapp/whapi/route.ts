import { NextResponse } from 'next/server';
import { isJobMessage, sendWhapiText, quickScamVerdict } from '@ddots/api/lib/import';
import { enqueueWhapiImport } from '@ddots/api/lib/queue';
import { getWhapiSettings, evaluateCriteria, SKIP_LABEL } from '@ddots/api/lib/whapi-criteria';
import { db, jobAlerts, eq, and, sql } from '@ddots/db';

const SCAM_INTENT = /scam check|check this job|is this (a )?scam|تحقق/i;

export async function GET() {
  return NextResponse.json({ ok: true });
}

type WhapiMsg = {
  id?: string;
  from?: string;
  from_name?: string;
  chat_id?: string;
  chat_name?: string;
  timestamp?: number;
  from_me?: boolean;
  type?: string;
  text?: { body?: string };
  link_preview?: { body?: string; description?: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string };
};

const TEXTUAL_TYPES = ['text', 'link_preview', 'image', 'video', 'document'];

// Pull usable text from any supported message shape.
const getText = (m: WhapiMsg): string =>
  (m.text?.body ||
    m.link_preview?.body ||
    m.link_preview?.description ||
    m.image?.caption ||
    m.video?.caption ||
    m.document?.caption ||
    '').trim();

// Whapi.cloud webhook → extract job → DRAFT + reply. Always returns 200 (Whapi retries non-200).
export async function POST(req: Request) {
  const raw = await req.text();

  // Debug: log headers (token values redacted) + body so we can see what Whapi sends.
  const headers = Object.fromEntries(req.headers);
  const redacted = { ...headers };
  for (const k of ['x-whapi-token', 'authorization']) if (redacted[k]) redacted[k] = `${redacted[k].slice(0, 4)}…(${redacted[k].length})`;
  console.log('[whapi] webhook received:', { headers: redacted, body: raw.slice(0, 2000) });

  // Soft token verification: only reject when a token is set AND a wrong one is sent.
  const expected = process.env.WHAPI_TOKEN;
  if (expected) {
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const provided = req.headers.get('x-whapi-token') ?? bearer;
    if (provided && provided !== expected) return new NextResponse('Forbidden', { status: 403 });
    if (!provided) console.warn('[whapi] no token header present — continuing (set webhook secret to enforce).');
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    console.error('[whapi] body not JSON');
    return NextResponse.json({ ok: true }); // 200 so Whapi doesn't retry malformed payloads
  }
  console.log('[whapi] full body:', JSON.stringify(payload).slice(0, 1000));

  // Whapi sends { messages: [...] }; some setups use { data: [...] } or a bare array.
  const messages: WhapiMsg[] =
    (Array.isArray(payload.messages) ? payload.messages : undefined) ??
    (Array.isArray(payload.data) ? payload.data : undefined) ??
    (Array.isArray(payload) ? (payload as unknown as WhapiMsg[]) : undefined) ??
    [];
  console.log(`[whapi] parsed ${messages.length} message(s)`);

  const settings = await getWhapiSettings();

  try {
    for (const m of messages) {
      if (m.from_me && settings.blockOwnMessages) { console.log('[whapi] skip: from_me'); continue; }
      // Skip non-textual events fast (reactions, statuses, calls, etc.).
      if (m.type && !TEXTUAL_TYPES.includes(m.type)) { console.log('[whapi] skip: type', m.type); continue; }
      const text = getText(m);
      const from = m.from ?? m.chat_id ?? '';
      const chatId = m.chat_id ?? '';

      // Scam-check intent is always answered regardless of import criteria.
      // STOP → unsubscribe this number from WhatsApp job alerts.
      if (/^\s*(stop|unsubscribe|الغاء|إلغاء)\s*$/i.test(text)) {
        const num = (m.from ?? '').replace(/\D/g, '');
        if (num) {
          await db
            .update(jobAlerts)
            .set({ isActive: false })
            .where(and(eq(jobAlerts.channel, 'whatsapp'), sql`regexp_replace(${jobAlerts.whatsappNumber}, '[^0-9]', '', 'g') = ${num}`))
            .catch((e) => console.error('[whapi] unsubscribe failed:', e));
          await sendWhapiText(m.from ?? num, '✅ You have been unsubscribed from WhatsApp job alerts. Reply anytime to re-enable in your dashboard.').catch(() => {});
        }
        continue;
      }

      if (SCAM_INTENT.test(text)) {
        if (from) await sendWhapiText(from, await quickScamVerdict(text));
        continue;
      }

      // Apply admin-configured import criteria.
      const verdict = evaluateCriteria(text, { from, chatId, isJobKeyword: isJobMessage }, settings);
      if (!verdict.ok) {
        console.log(`[whapi] skip: ${verdict.reason}${verdict.detail ? ` (${verdict.detail})` : ''}`);
        if (settings.replyOnSkip && settings.skipMessage && from) {
          await sendWhapiText(from, settings.skipMessage.replace('[reason]', SKIP_LABEL[verdict.reason!] ?? verdict.reason ?? ''));
        }
        continue;
      }

      // Hand AI extraction to the rate-limited queue and return 200 instantly.
      try {
        await enqueueWhapiImport({
          text,
          source: 'whapi',
          sourceMetadata: {
            messageId: m.id ?? null,
            from,
            fromName: m.from_name ?? m.chat_name ?? null,
            chatId: m.chat_id ?? null,
            chatName: m.chat_name ?? null,
            receivedAt: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : new Date().toISOString(),
            raw: text.slice(0, 1000),
          },
          autoPublish: settings.autoPublish,
          reply: from ? { to: from, onSuccess: settings.replyOnSuccess, successMessage: settings.successMessage } : null,
        });
        console.log('[whapi] queued for import:', m.id ?? '(no id)');
      } catch (err) {
        console.error('[whapi] enqueue error:', err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.error('[whapi] processing error:', err instanceof Error ? err.message : err);
  }
  return NextResponse.json({ ok: true }); // always 200
}
