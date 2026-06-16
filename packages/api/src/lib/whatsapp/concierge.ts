/**
 * "Zainab" — the DdotsMediaJobs AI concierge (WhatsApp + Telegram).
 * Detects intent via Haiku, then routes: job SEARCH, SALARY lookup, ALERT
 * setup, UAE TOOLS (gratuity), or general CHAT. Fails safe — never throws.
 */
import { db, jobs, salaryReports, eq, and, desc, ilike, sql } from '@ddots/db';
import { CATEGORIES, EMIRATES, formatSalary } from '@ddots/shared';
import { chat, structured, MODEL_FAST } from '../anthropic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ddotsmediajobs.com';

const ZAINAB_SYSTEM = `You are Zainab, the friendly WhatsApp assistant for DdotsMediaJobs, a UAE job portal.
Be warm, concise and professional. You know the UAE job market, labour law basics, visas, salaries and interviews.
Reply in the user's language (English, Arabic, Tagalog or Hindi). Keep replies under 120 words and WhatsApp-friendly.
If asked to do something you cannot, point them to ddotsmediajobs.com. Never invent specific job listings.`;

type Intent = { intent: 'search' | 'salary' | 'alert' | 'gratuity' | 'chat'; role?: string; emirate?: string; category?: string; years?: number; monthlySalary?: number };

const INTENT_TOOL = {
  name: 'classify',
  description: 'Classify a UAE jobseeker WhatsApp/Telegram message and extract parameters.',
  input_schema: {
    type: 'object' as const,
    properties: {
      intent: { type: 'string', enum: ['search', 'salary', 'alert', 'gratuity', 'chat'], description: 'search=find jobs, salary=pay question, alert=wants job alerts, gratuity=end-of-service/gratuity calc, chat=anything else' },
      role: { type: 'string', description: 'Job title/role mentioned, else empty' },
      emirate: { type: 'string', description: 'Emirate name mentioned, else empty' },
      category: { type: 'string', description: 'Job category mentioned, else empty' },
      years: { type: 'number', description: 'Years of service for gratuity, else 0' },
      monthlySalary: { type: 'number', description: 'Monthly AED salary for gratuity, else 0' },
    },
    required: ['intent'],
  },
};

function matchCategory(s: string) { return CATEGORIES.find((c) => s.includes(c.slug) || s.includes(c.name.toLowerCase().split(' ')[0] ?? '')); }
function matchEmirate(s: string) { return EMIRATES.find((e) => s.includes(e.name.toLowerCase()) || s.includes(e.slug.replace(/-/g, ' '))); }

async function doSearch(role: string, categorySlug: string | undefined, emirateSlug: string | undefined): Promise<string> {
  const conds = [eq(jobs.status, 'active')];
  if (categorySlug) conds.push(eq(jobs.categorySlug, categorySlug));
  if (emirateSlug) conds.push(eq(jobs.emirateSlug, emirateSlug));
  if (role && !categorySlug) conds.push(ilike(jobs.title, `%${role}%`));
  const rows = await db.query.jobs.findMany({ where: and(...conds), orderBy: [desc(jobs.publishedAt)], limit: 3, with: { company: { columns: { name: true } } } });
  if (!rows.length) return `No live matches right now. Browse all jobs: ${APP_URL}/jobs`;
  const lines = rows.map((r, i) => `*${i + 1}. ${r.title}* — ${r.company?.name ?? 'Employer'}\n${r.emirateSlug} · ${formatSalary(r.salaryMin, r.salaryMax, r.salaryPeriod, r.salaryHidden, r.salaryNegotiable)}\n${APP_URL}/jobs/${r.slug}`);
  return `Here are ${rows.length} matching jobs 👇\n\n${lines.join('\n\n')}\n\nReply with another search anytime.`;
}

async function doSalary(role: string, emirateSlug: string | undefined): Promise<string> {
  if (!role) return 'Tell me a role, e.g. "Accountant salary in Abu Dhabi?"';
  const conds = [ilike(salaryReports.jobTitle, `%${role}%`)];
  if (emirateSlug) conds.push(eq(salaryReports.emirateSlug, emirateSlug));
  const [agg] = await db
    .select({ avg: sql<number>`coalesce(round(avg(${salaryReports.salaryMonthly})),0)::int`, min: sql<number>`coalesce(min(${salaryReports.salaryMonthly}),0)::int`, max: sql<number>`coalesce(max(${salaryReports.salaryMonthly}),0)::int`, n: sql<number>`count(*)::int` })
    .from(salaryReports)
    .where(and(...conds));
  if (!agg || agg.n === 0) return `I don't have salary reports for "${role}" yet. See the UAE salary guide: ${APP_URL}/salary-guide`;
  return `💰 *${role}* in the UAE${emirateSlug ? ` (${emirateSlug})` : ''}:\nAED ${agg.min.toLocaleString('en-AE')} – ${agg.max.toLocaleString('en-AE')} /mo (avg AED ${agg.avg.toLocaleString('en-AE')})\nBased on ${agg.n} report${agg.n === 1 ? '' : 's'}. More: ${APP_URL}/salary-guide`;
}

/** UAE end-of-service gratuity: 21 days/yr first 5y, 30 days/yr after; capped at 2 years' pay. */
function gratuity(years: number, monthly: number): string {
  if (!years || !monthly) return 'Send years of service and monthly basic pay, e.g. "Calculate gratuity 3 years AED 5000".';
  if (years < 1) return 'Under 1 year of service: no gratuity is due under UAE law.';
  const daily = monthly / 30;
  const first = Math.min(years, 5) * 21 * daily;
  const extra = Math.max(0, years - 5) * 30 * daily;
  const total = Math.min(first + extra, monthly * 24);
  return `🧮 Estimated gratuity for ${years} year(s) at AED ${monthly.toLocaleString('en-AE')}/mo basic:\n*≈ AED ${Math.round(total).toLocaleString('en-AE')}*\n(21 days/yr first 5 years, 30 days/yr after; capped at 2 years' pay. Estimate only.)`;
}

export async function conciergeReply(text: string, _from?: string): Promise<string> {
  try {
    const lower = text.toLowerCase();
    let cls: Intent;
    try {
      cls = await structured<Intent>('Classify the message. Call classify.', `<user_content>\n${text.slice(0, 800)}\n</user_content>`, INTENT_TOOL, { model: MODEL_FAST, maxTokens: 200 });
    } catch {
      cls = { intent: 'chat' };
    }

    const emirateSlug = (cls.emirate ? matchEmirate(cls.emirate.toLowerCase()) : matchEmirate(lower))?.slug;
    const categorySlug = (cls.category ? matchCategory(cls.category.toLowerCase()) : matchCategory(lower))?.slug;
    const role = (cls.role ?? '').trim();

    switch (cls.intent) {
      case 'search':
        return await doSearch(role, categorySlug, emirateSlug);
      case 'salary':
        return await doSalary(role || categorySlug || '', emirateSlug);
      case 'gratuity':
        return gratuity(Number(cls.years) || 0, Number(cls.monthlySalary) || 0);
      case 'alert':
        return `🔔 To get job alerts on WhatsApp, set them up here (takes 30s): ${APP_URL}/dashboard/alerts\nYou'll then get matching jobs sent automatically. Reply STOP anytime to unsubscribe.`;
      default: {
        const answer = await chat(ZAINAB_SYSTEM, [{ role: 'user', content: `<user_content>\n${text.slice(0, 1500)}\n</user_content>` }], { model: MODEL_FAST, maxTokens: 400 });
        return answer || 'I can help with UAE jobs. Try "Find nurse jobs Dubai", "Accountant salary Abu Dhabi?", or "Calculate gratuity 3 years AED 5000".';
      }
    }
  } catch (err) {
    console.error('[concierge] failed:', err instanceof Error ? err.message : err);
    return `I'm Zainab 👋 I can find UAE jobs, salary ranges and calculate gratuity. Try "Find driver jobs Dubai" or browse ${APP_URL}/jobs`;
  }
}
