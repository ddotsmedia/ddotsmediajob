import { NextResponse } from 'next/server';
import { extractAndSaveDraft, isJobMessage } from '@ddots/api/lib/import';
import { rateLimit } from '@ddots/api/lib/security';

type Inbound = { from?: string | { address?: string }; subject?: string; text?: string; html?: string; data?: Inbound };

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Resend inbound email webhook → extract job → DRAFT.
export async function POST(req: Request) {
  // Shared-secret check (full Svix verification would need the svix SDK).
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret) {
    const got = req.headers.get('x-webhook-secret') ?? new URL(req.url).searchParams.get('secret');
    if (got !== secret) return new NextResponse('Forbidden', { status: 403 });
  }

  let body: Inbound;
  try {
    body = (await req.json()) as Inbound;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const rl = await rateLimit('import:email', 100, 3600);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });

  const d = body.data ?? body;
  const text = (d.text || (d.html ? stripHtml(d.html) : '') || '').trim();
  const from = typeof d.from === 'string' ? d.from : d.from?.address ?? '';
  if (text.length < 15 || !isJobMessage(text)) return NextResponse.json({ ok: true, skipped: true });

  try {
    const saved = await extractAndSaveDraft(text, 'email', { from, subject: d.subject });
    return NextResponse.json({ ok: true, draft: saved?.title ?? null });
  } catch (err) {
    console.error('[email-inbound]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
