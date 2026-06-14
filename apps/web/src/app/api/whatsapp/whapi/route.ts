import { NextResponse } from 'next/server';
import { extractAndSaveDraft, isJobMessage, sendWhapiText, quickScamVerdict } from '@ddots/api/lib/import';
import { rateLimit } from '@ddots/api/lib/security';

const SCAM_INTENT = /scam check|check this job|is this (a )?scam|تحقق/i;

export async function GET() {
  return NextResponse.json({ ok: true });
}

// Whapi.cloud webhook → extract job → DRAFT + WhatsApp reply.
export async function POST(req: Request) {
  // Verify webhook token.
  const expected = process.env.WHAPI_TOKEN;
  if (expected) {
    const token = req.headers.get('x-whapi-token');
    if (token !== expected) return new NextResponse('Forbidden', { status: 403 });
  }

  let payload: { messages?: Array<{ from?: string; chat_id?: string; from_me?: boolean; text?: { body?: string }; image?: { caption?: string }; video?: { caption?: string } }> };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const messages = payload.messages ?? [];
  for (const m of messages) {
    if (m.from_me) continue;
    const text = (m.text?.body ?? m.image?.caption ?? m.video?.caption ?? '').trim();
    const from = m.from ?? m.chat_id ?? '';
    if (text.length < 15) continue;

    // Scam-check intent → reply with a risk verdict (no draft).
    if (SCAM_INTENT.test(text)) {
      if (from) await sendWhapiText(from, await quickScamVerdict(text));
      continue;
    }
    if (!isJobMessage(text)) continue;

    // Max 20 AI extractions/hour from Whapi.
    const rl = await rateLimit('import:whapi', 20, 3600);
    if (!rl.ok) { if (from) await sendWhapiText(from, 'Too many imports this hour — try again later.'); break; }
    try {
      const saved = await extractAndSaveDraft(text, 'whapi', { from, raw: text.slice(0, 1000) });
      if (saved && from) await sendWhapiText(from, `✅ Job draft created: ${saved.title}\nReview at https://ddotsmediajobs.com/admin/jobs/drafts`);
    } catch (err) {
      console.error('[whapi]', err);
    }
  }
  return NextResponse.json({ ok: true });
}
