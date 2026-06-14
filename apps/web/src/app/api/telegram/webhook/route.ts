import { NextResponse } from 'next/server';
import { db, jobs, applications, eq, and, gte, count, desc } from '@ddots/db';
import { extractAndSaveDraft, isJobMessage, sendTelegram } from '@ddots/api/lib/import';
import { rateLimit } from '@ddots/api/lib/security';

const DRAFTS_LINK = 'https://ddotsmediajobs.com/admin/jobs/drafts';
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  // Verify secret (query param per setup, or Telegram's header).
  const secret = process.env.TELEGRAM_SECRET;
  if (secret) {
    const fromQuery = new URL(req.url).searchParams.get('secret_token');
    const fromHeader = req.headers.get('x-telegram-bot-api-secret-token');
    if (fromQuery !== secret && fromHeader !== secret) return new NextResponse('Forbidden', { status: 403 });
  }

  let update: { message?: { chat?: { id?: number }; text?: string; caption?: string; from?: { id?: number } } };
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  const chatId = msg?.chat?.id;
  if (!msg || chatId == null) return NextResponse.json({ ok: true });

  const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const authorized = !adminChat || String(chatId) === adminChat;
  if (!authorized) {
    await sendTelegram(chatId, 'Unauthorized. Contact admin.');
    return NextResponse.json({ ok: true });
  }

  const text = (msg.text ?? msg.caption ?? '').trim();

  // ── Commands ──
  if (text.startsWith('/')) {
    const [cmd, arg] = text.split(/\s+/, 2);
    if (cmd === '/start') {
      await sendTelegram(chatId, "Hi! I'm Zainab, your UAE job assistant.\nForward any job message to create a draft.\n\nCommands:\n/pending — list jobs awaiting approval\n/drafts — draft count\n/top — top jobs today\n/stats — today's numbers\n/approve <id> · /reject <id>\n/help");
    } else if (cmd === '/help') {
      await sendTelegram(chatId, 'Commands:\n/pending /drafts /top /stats\n/approve <id> /reject <id>\nForward a job message to create a draft.');
    } else if (cmd === '/pending') {
      const rows = await db.query.jobs.findMany({ where: eq(jobs.status, 'draft'), orderBy: [desc(jobs.createdAt)], limit: 5, columns: { id: true, title: true, emirateSlug: true } });
      if (!rows.length) await sendTelegram(chatId, 'No jobs awaiting approval. 🎉');
      else await sendTelegram(chatId, 'Pending approval:\n\n' + rows.map((r) => `${r.title} — ${r.emirateSlug}\n/approve ${r.id}`).join('\n\n'));
    } else if (cmd === '/top') {
      const rows = await db.query.jobs.findMany({ where: eq(jobs.status, 'active'), orderBy: [desc(jobs.viewCount)], limit: 5, columns: { title: true, viewCount: true, emirateSlug: true } });
      await sendTelegram(chatId, rows.length ? 'Top jobs by views:\n\n' + rows.map((r, i) => `${i + 1}. ${r.title} (${r.emirateSlug}) — ${r.viewCount} views`).join('\n') : 'No active jobs yet.');
    } else if (cmd === '/drafts') {
      const [r] = await db.select({ n: count() }).from(jobs).where(eq(jobs.status, 'draft'));
      await sendTelegram(chatId, `You have ${r?.n ?? 0} pending drafts.\nReview: ${DRAFTS_LINK}`);
    } else if (cmd === '/stats') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const [j] = await db.select({ n: count() }).from(jobs).where(and(eq(jobs.status, 'active'), gte(jobs.publishedAt, start)));
      const [a] = await db.select({ n: count() }).from(applications).where(gte(applications.createdAt, start));
      await sendTelegram(chatId, `Today: ${j?.n ?? 0} jobs posted, ${a?.n ?? 0} applications received.`);
    } else if (cmd === '/approve' || cmd === '/reject') {
      const id = arg?.match(UUID)?.[0];
      if (!id) {
        await sendTelegram(chatId, `Usage: ${cmd} <job-id>`);
      } else {
        const status = cmd === '/approve' ? 'active' : 'rejected';
        await db.update(jobs).set({ status, publishedAt: status === 'active' ? new Date() : undefined }).where(eq(jobs.id, id));
        await sendTelegram(chatId, `${cmd === '/approve' ? '✅ Approved' : '❌ Rejected'}: ${id}`);
      }
    } else {
      await sendTelegram(chatId, 'Unknown command. Try /start');
    }
    return NextResponse.json({ ok: true });
  }

  // ── Job message → draft ──
  const rl = await rateLimit('import:telegram', 100, 3600);
  if (!rl.ok) { await sendTelegram(chatId, 'Too many imports this hour — try again later.'); return NextResponse.json({ ok: true }); }

  if (text.length < 15 || !isJobMessage(text)) {
    await sendTelegram(chatId, 'Send a job vacancy message to create a draft.');
    return NextResponse.json({ ok: true });
  }

  try {
    const saved = await extractAndSaveDraft(text, 'telegram', { chatId, raw: text.slice(0, 1000) });
    await sendTelegram(chatId, saved ? `✅ Draft created!\n${saved.title}\nReview: ${DRAFTS_LINK}` : 'Could not create a draft (no admin configured).');
  } catch (err) {
    console.error('[telegram]', err);
    await sendTelegram(chatId, 'Sorry — could not extract a job from that message.');
  }
  return NextResponse.json({ ok: true });
}
