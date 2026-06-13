/**
 * "Zainab" — the DdotsMediaJobs WhatsApp AI concierge.
 * Handles free-text seeker messages (job search + career questions) as a
 * fallback once the message is confirmed NOT to be a job posting. Fails safe:
 * any error returns a helpful message, never throws into the webhook.
 */
import { db, jobs, eq, and, desc } from '@ddots/db';
import { CATEGORIES, EMIRATES, formatSalary } from '@ddots/shared';
import { chat, MODEL_FAST } from '../anthropic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ddotsmediajobs.com';

const ZAINAB_SYSTEM = `You are Zainab, the friendly WhatsApp assistant for DdotsMediaJobs, a UAE job portal.
Be warm, concise and professional. You know the UAE job market, labour law basics, visas, salaries and interviews.
Reply in the user's language (English, Arabic, Tagalog or Hindi). Keep replies under 120 words and WhatsApp-friendly.
If asked to do something you cannot, point them to ddotsmediajobs.com. Never invent specific job listings.`;

function detectJobSearch(lower: string): boolean {
  return /\b(find|show|search|job|jobs|vacanc|hiring|work|apply|walk.?in|salary|pay)\b/.test(lower);
}

async function searchJobs(lower: string): Promise<string | null> {
  const cat = CATEGORIES.find((c) => lower.includes(c.slug) || lower.includes(c.name.toLowerCase().split(' ')[0] ?? ''));
  const em = EMIRATES.find((e) => lower.includes(e.name.toLowerCase()) || lower.includes(e.slug.replace(/-/g, ' ')));
  const conds = [eq(jobs.status, 'active')];
  if (cat) conds.push(eq(jobs.categorySlug, cat.slug));
  if (em) conds.push(eq(jobs.emirateSlug, em.slug));
  if (!cat && !em) return null; // too vague — let the AI handle it
  const rows = await db.query.jobs.findMany({
    where: and(...conds),
    orderBy: [desc(jobs.publishedAt)],
    limit: 3,
    with: { company: { columns: { name: true } } },
  });
  if (!rows.length) return null;
  const lines = rows.map((r, i) => {
    const pay = formatSalary(r.salaryMin, r.salaryMax, r.salaryPeriod, r.salaryHidden);
    return `*${i + 1}. ${r.title}* — ${r.company?.name ?? 'Employer'}\n${r.emirateSlug} · ${pay}\n${APP_URL}/jobs/${r.slug}`;
  });
  return `Here are ${rows.length} matching jobs 👇\n\n${lines.join('\n\n')}\n\nReply with another search anytime, or send "menu".`;
}

export async function conciergeReply(text: string): Promise<string> {
  const lower = text.toLowerCase();
  try {
    if (detectJobSearch(lower)) {
      const jobsReply = await searchJobs(lower);
      if (jobsReply) return jobsReply;
    }
    const answer = await chat(
      ZAINAB_SYSTEM,
      [{ role: 'user', content: `<user_content>\n${text.slice(0, 1500)}\n</user_content>` }],
      { model: MODEL_FAST, maxTokens: 400 },
    );
    return answer || "I'm here to help with UAE jobs. Try: \"Find nurse jobs in Dubai\" or send \"menu\".";
  } catch (err) {
    console.error('[concierge] failed:', err instanceof Error ? err.message : err);
    return "I'm Zainab 👋 I can help you find UAE jobs and answer career questions. Try \"Find driver jobs in Dubai\", or browse " + APP_URL + '/jobs';
  }
}
