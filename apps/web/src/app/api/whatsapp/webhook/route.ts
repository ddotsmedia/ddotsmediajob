import { NextResponse } from 'next/server';
import { db, jobs, eq, and, desc, ilike, or } from '@ddots/db';
import { formatSalary, SITE } from '@ddots/shared';

/**
 * WhatsApp bot (Meta Cloud API).
 *   GET  — webhook verification handshake.
 *   POST — inbound messages: treat text as a job-search query and reply with matches.
 * Set WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID in env.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from: string | undefined = msg?.from;
  const text: string | undefined = msg?.text?.body;

  if (from && text) {
    const reply = await buildReply(text);
    await sendWhatsapp(from, reply).catch((e) => console.error('[whatsapp] send failed', e));
  }
  // Always 200 so Meta doesn't retry.
  return NextResponse.json({ ok: true });
}

async function buildReply(query: string): Promise<string> {
  const q = query.trim().slice(0, 100);
  const rows = await db.query.jobs
    .findMany({
      where: and(
        eq(jobs.status, 'active'),
        or(ilike(jobs.title, `%${q}%`), ilike(jobs.description, `%${q}%`))!,
      ),
      orderBy: [desc(jobs.publishedAt)],
      limit: 5,
      with: { company: { columns: { name: true } } },
    })
    .catch(() => []);

  if (rows.length === 0) {
    return `No jobs found for "${q}". Try a different keyword, or browse all jobs at ${SITE.url}/jobs`;
  }
  const lines = rows.map(
    (j, i) =>
      `${i + 1}. *${j.title}* — ${j.company?.name ?? 'Employer'}\n   ${formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden)}\n   ${SITE.url}/jobs/${j.slug}`,
  );
  return `Top jobs for "${q}":\n\n${lines.join('\n\n')}\n\nReply with another keyword to search again.`;
}

async function sendWhatsapp(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.log('[whatsapp] (dry run) →', `***${String(to).replace(/\D/g, '').slice(-4)}`);
    return;
  }
  await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text.slice(0, 4000) },
    }),
  });
}
