import { NextResponse } from 'next/server';
import { db, sql } from '@ddots/db';
import { getRedis } from '@ddots/api/lib/queue';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Liveness/readiness probe. Never throws — reports each dependency as a bool. */
export async function GET() {
  const [dbOk, redisOk] = await Promise.all([
    db
      .execute(sql`select 1`)
      .then(() => true)
      .catch(() => false),
    getRedis()
      .ping()
      .then((r) => r === 'PONG')
      .catch(() => false),
  ]);

  const status = dbOk ? 'ok' : 'degraded';
  return NextResponse.json(
    { status, db: dbOk, redis: redisOk, timestamp: new Date().toISOString() },
    { status: dbOk ? 200 : 503 },
  );
}
