import { NextResponse } from 'next/server';
import { extractAndSaveDraft, isJobMessage, sendWhapiText, quickScamVerdict } from '@ddots/api/lib/import';
import { rateLimit } from '@ddots/api/lib/security';

const SCAM_INTENT = /scam check|check this job|is this (a )?scam|تحقق/i;

export async function GET() {
  return NextResponse.json({ ok: true });
}

type WhapiMsg = { from?: string; chat_id?: string; from_me?: boolean; text?: { body?: string }; image?: { caption?: string }; video?: { caption?: string } };

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

  let payload: { messages?: WhapiMsg[] };
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ ok: true }); // 200 so Whapi doesn't retry malformed payloads
  }

  try {
    for (const m of payload.messages ?? []) {
      if (m.from_me) continue;
      const text = (m.text?.body ?? m.image?.caption ?? m.video?.caption ?? '').trim();
      const from = m.from ?? m.chat_id ?? '';
      if (text.length < 15) continue;

      if (SCAM_INTENT.test(text)) {
        if (from) await sendWhapiText(from, await quickScamVerdict(text));
        continue;
      }
      if (!isJobMessage(text)) continue;

      const rl = await rateLimit('import:whapi', 20, 3600); // max 20 AI extractions/hour
      if (!rl.ok) { if (from) await sendWhapiText(from, 'Too many imports this hour — try again later.'); break; }
      const saved = await extractAndSaveDraft(text, 'whapi', { from, raw: text.slice(0, 1000) });
      if (saved && from) await sendWhapiText(from, `✅ Job draft created: ${saved.title}\nReview at https://ddotsmediajobs.com/admin/jobs/drafts`);
    }
  } catch (err) {
    console.error('[whapi] processing error:', err instanceof Error ? err.message : err);
  }
  return NextResponse.json({ ok: true }); // always 200
}
