import { NextResponse } from 'next/server';
import { expireStaleJobs } from '@ddots/api/lib/helpers';

export const dynamic = 'force-dynamic';

/**
 * Auto-expire cron endpoint. Flips active jobs past their expiry to `expired`
 * and notifies owners. Wire to system cron (hourly):
 *   0 * * * * curl -fsS -H "x-cron-secret: $CRON_SECRET" https://ddotsmediajobs.com/api/cron/expire-jobs
 * Protected by the CRON_SECRET env var; returns 401 if missing/mismatched.
 */
async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  const provided = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const expired = await expireStaleJobs();
    return NextResponse.json({ ok: true, expired });
  } catch (err) {
    console.error('[cron/expire-jobs] failed', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
