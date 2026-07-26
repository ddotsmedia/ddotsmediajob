import { NextResponse } from 'next/server';
import { db, jobs, ctaClicks, eq, sql } from '@ddots/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Legacy aggregate counters — view_count is still displayed, so keep incrementing it.
const COLUMN: Record<string, 'whatsapp_apply_count' | 'cv_apply_count' | 'view_count'> = {
  whatsapp_apply: 'whatsapp_apply_count',
  cv_apply: 'cv_apply_count',
  view: 'view_count',
};
// Legacy click actions → new cta_type (Phase 7 cleanup). 'view' is not a CTA.
const ACTION_TO_CTA: Record<string, string> = { whatsapp_apply: 'whatsapp', cv_apply: 'apply_button' };
const CTA_OK = new Set(['whatsapp', 'email', 'external_link', 'apply_button']);
const SRC_OK = new Set(['job_detail', 'search', 'email', 'push', 'mobile_apply_bar']);

/** Record a cta_clicks row (resolving jobId from slug when needed). */
async function recordCta(slug: string, jobId: string | null, ctaType: string | null, sourcePage: string | null): Promise<void> {
  if (!ctaType || !CTA_OK.has(ctaType)) return;
  let id = jobId;
  if (!id && slug) id = (await db.query.jobs.findFirst({ where: eq(jobs.slug, slug), columns: { id: true } }).catch(() => null))?.id ?? null;
  if (!id) return;
  const sp = sourcePage && SRC_OK.has(sourcePage) ? sourcePage : 'job_detail';
  await db.insert(ctaClicks).values({ userId: null, jobId: id, ctaType, sourcePage: sp }).catch(() => {});
}

async function handle(slug: string, url: URL, action: string): Promise<void> {
  // 1) Legacy counter (preserves view_count — still shown on job cards).
  const col = COLUMN[action];
  if (col) void db.update(jobs).set({ [col]: sql`${sql.identifier(col)} + 1` }).where(eq(jobs.slug, slug)).catch(() => {});
  // 2) New structured cta_clicks — from query params or a mapped click action.
  const ctaType = url.searchParams.get('ctaType') ?? ACTION_TO_CTA[action] ?? null;
  await recordCta(slug, url.searchParams.get('jobId'), ctaType, url.searchParams.get('sourcePage'));
}

/** GET pixel/beacon: ?jobId=&ctaType=&sourcePage= */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const { slug } = await params;
  await handle(slug, new URL(req.url), '');
  return NextResponse.json({ success: true });
}

/** POST beacon — query params, or the legacy {action} body (view / *_apply) from old callers. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const { slug } = await params;
  let action = '';
  try { action = String(((await req.json()) as { action?: string }).action ?? ''); } catch { /* empty beacon body */ }
  await handle(slug, new URL(req.url), action);
  return NextResponse.json({ success: true });
}
