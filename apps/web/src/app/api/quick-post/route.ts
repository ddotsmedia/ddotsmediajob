import { NextResponse } from 'next/server';
import { auth } from '@ddots/auth';
import { createJobFromWhatsApp, type ParsedJob } from '@ddots/api/lib/whatsapp';
import { SITE } from '@ddots/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseSalary(raw: string): { min: number | null; max: number | null } {
  const nums = raw.replace(/,/g, '').match(/\d+(?:\.\d+)?k?/gi)?.map((n) => Math.round(parseFloat(n) * (/k$/i.test(n) ? 1000 : 1)));
  if (!nums?.length) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0]!, max: nums[0]! };
  return { min: Math.min(nums[0]!, nums[1]!), max: Math.max(nums[0]!, nums[1]!) };
}

export async function POST(req: Request): Promise<NextResponse> {
  let data: Record<string, unknown>;
  try {
    data = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Auth: valid quick-post token OR admin session.
  const token = String(data.token ?? '');
  const envToken = process.env.QUICK_POST_TOKEN;
  let authorized = !!envToken && token === envToken;
  if (!authorized) {
    const session = await auth();
    authorized = session?.user?.role === 'admin';
  }
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const title = String(data.title ?? '').trim();
  const emirate = String(data.emirate ?? '').trim();
  if (title.length < 3 || !emirate) return NextResponse.json({ error: 'Title and emirate are required' }, { status: 400 });

  const { min, max } = parseSalary(String(data.salary ?? ''));
  const draft: ParsedJob = {
    title,
    company: null,
    category: null,
    emirate,
    salary_min: min,
    salary_max: max,
    job_type: null,
    visa_provided: !!data.visa_provided,
    accommodation: !!data.accommodation,
    contact_whatsapp: String(data.contact_whatsapp ?? '') || null,
    contact_email: null,
    description: String(data.description ?? '') || null,
    urgent: !!data.urgent,
  };

  try {
    const { slug } = await createJobFromWhatsApp(draft, 'quick-post', 'quick_post');
    return NextResponse.json({ slug, url: `${SITE.url}/jobs/${slug}` });
  } catch (err) {
    console.error('[quick-post]', err);
    return NextResponse.json({ error: 'Could not post job' }, { status: 500 });
  }
}
