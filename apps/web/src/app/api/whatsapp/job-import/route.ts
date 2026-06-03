import { NextResponse } from 'next/server';
import { db, jobs, users, companies, notifications, eq } from '@ddots/db';
import { structured, JOB_DRAFT_TOOL, MODEL_FAST, type JobDraft } from '@ddots/api/lib/anthropic';
import { verifyTwilioSignature, rateLimit, wrapUserContent } from '@ddots/api/lib/security';
import { slugify, SITE } from '@ddots/shared';

/**
 * Forward a WhatsApp job message (via Twilio) here → AI extracts it → creates a
 * DRAFT job (never auto-published) + notifies all admins. Replies via TwiML.
 */
const SYSTEM =
  'You are a UAE recruitment expert. Extract structured job data from the message and call job_draft. ' +
  'Map locations to the correct emirate slug. If salary is unstated use 0. Set confidence per field.';

function twiml(message: string) {
  const esc = message.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc}</Message></Response>`, {
    headers: { 'content-type': 'text/xml' },
  });
}

export async function GET() {
  return new NextResponse('ok');
}

export async function POST(req: Request) {
  let body = '';
  let from = 'unknown';
  try {
    const form = await req.formData();
    body = String(form.get('Body') ?? '');
    from = String(form.get('From') ?? 'unknown');

    // Verify Twilio signature when configured (rejects spoofed requests).
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const params: Record<string, string> = {};
      form.forEach((v, k) => (params[k] = String(v)));
      const url = `${SITE.url}${new URL(req.url).pathname}`;
      if (!verifyTwilioSignature(authToken, req.headers.get('x-twilio-signature'), url, params)) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }
  } catch {
    return twiml('Could not read your message.');
  }

  // Per-phone rate limit (abuse + AI cost protection).
  const rl = await rateLimit(`wa-import:${from}`, 50, 3600);
  if (!rl.ok) return twiml('Too many imports this hour — please try again later.');
  if (body.trim().length < 15) return twiml('Please forward a full job posting to import it.');

  try {
    const draft = await structured<JobDraft>(SYSTEM, `Extract the job posting from this message:\n\n${wrapUserContent(body)}`, JOB_DRAFT_TOOL, {
      model: MODEL_FAST,
      maxTokens: 1800,
    });

    const admin = await db.query.users.findFirst({ where: eq(users.role, 'admin') });
    if (!admin) return twiml('No admin account is configured to receive imports.');

    let companyId: string | null = null;
    if (draft.company?.trim()) {
      const slug = slugify(draft.company);
      const existing = await db.query.companies.findFirst({ where: eq(companies.slug, slug) });
      companyId = existing?.id ?? (await db.insert(companies).values({ slug, name: draft.company.trim(), industry: 'General' }).returning())[0]?.id ?? null;
    }

    const jobSlug = `${slugify(draft.title) || 'job'}-${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(jobs).values({
      slug: jobSlug,
      employerId: admin.id,
      companyId,
      title: draft.title,
      description: draft.description + (draft.requirements ? `\n\nRequirements:\n${draft.requirements}` : ''),
      categorySlug: draft.categorySlug,
      emirateSlug: draft.emirate,
      location: draft.area || null,
      jobType: draft.jobType as never,
      experienceLevel: '1-3-years' as never,
      salaryMin: draft.salaryMin || null,
      salaryMax: draft.salaryMax || null,
      visaProvided: draft.visaProvided,
      accommodationProvided: draft.accommodation,
      isRemote: draft.remote,
      isUrgent: draft.urgent,
      isFresher: draft.freshersWelcome,
      freeZone: draft.freeZone,
      skills: draft.tags ?? [],
      benefits: draft.benefits ?? [],
      contactWhatsapp: draft.contactWhatsapp || null,
      status: 'draft',
      source: 'whatsapp',
      aiGenerated: true,
    });

    const admins = await db.query.users.findMany({ where: eq(users.role, 'admin'), columns: { id: true } });
    if (admins.length) {
      await db.insert(notifications).values(
        admins.map((a) => ({ userId: a.id, type: 'wa-import', title: '1 new job draft from WhatsApp', body: draft.title, link: '/admin/jobs/drafts' })),
      );
    }

    return twiml(`✅ Draft created: ${draft.title}. Review it in Admin → Job Drafts.`);
  } catch (err) {
    console.error('[wa job-import]', err);
    return twiml('Sorry — could not extract a job from that message.');
  }
}
