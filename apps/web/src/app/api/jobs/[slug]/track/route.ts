import { NextResponse } from 'next/server';
import { db, jobs, eq, sql } from '@ddots/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLUMN: Record<string, 'whatsapp_apply_count' | 'cv_apply_count' | 'view_count'> = {
  whatsapp_apply: 'whatsapp_apply_count',
  cv_apply: 'cv_apply_count',
  view: 'view_count',
};

/** Fire-and-forget click tracking for a job. No auth. Always 200. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const { slug } = await params;
  let action = '';
  try {
    action = String(((await req.json()) as { action?: string }).action ?? '');
  } catch {
    /* tolerate empty/sendBeacon bodies */
  }
  const col = COLUMN[action];
  if (col) {
    db.update(jobs)
      .set({ [col]: sql`${sql.identifier(col)} + 1` })
      .where(eq(jobs.slug, slug))
      .catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
