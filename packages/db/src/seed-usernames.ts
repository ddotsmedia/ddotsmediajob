/**
 * Backfill usernames for existing jobseeker profiles (Step 18).
 * Run: pnpm --filter @ddots/db exec tsx src/seed-usernames.ts
 * Idempotent: only fills profiles where username IS NULL.
 */
import { db } from './index';
import { jobseekerProfiles, users } from './schema';
import { eq, isNull } from 'drizzle-orm';
import { slugify } from '@ddots/shared';

async function uniqueUsername(name: string | null): Promise<string> {
  const base = (slugify(name ?? 'user') || 'user').replace(/-/g, '.').slice(0, 40) || 'user';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}.${i + 1}`;
    const clash = await db.query.jobseekerProfiles.findFirst({ where: eq(jobseekerProfiles.username, candidate), columns: { userId: true } });
    if (!clash) return candidate;
  }
  return `${base}.${Date.now().toString(36).slice(-4)}`;
}

async function main() {
  const rows = await db
    .select({ userId: jobseekerProfiles.userId, name: users.name })
    .from(jobseekerProfiles)
    .innerJoin(users, eq(users.id, jobseekerProfiles.userId))
    .where(isNull(jobseekerProfiles.username));

  let n = 0;
  for (const r of rows) {
    const username = await uniqueUsername(r.name);
    await db.update(jobseekerProfiles).set({ username }).where(eq(jobseekerProfiles.userId, r.userId));
    n++;
  }
  console.log(`✅ Backfilled ${n} username(s).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
