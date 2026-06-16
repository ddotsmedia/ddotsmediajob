import { db, jobCategories, asc, eq } from '@ddots/db';
import { cached } from './security';
import { getRedis } from './queue';

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  jobCount: number;
};

const CACHE_KEY = 'categories:active';

/** Active categories (Redis-cached 1h, fail-open to DB). */
export async function getCategoriesCached(): Promise<CategoryRow[]> {
  return cached(CACHE_KEY, 3600, async () => {
    const rows = await db.query.jobCategories.findMany({ where: eq(jobCategories.isActive, true), orderBy: [asc(jobCategories.sortOrder), asc(jobCategories.name)] });
    return rows as CategoryRow[];
  });
}

export async function invalidateCategories(): Promise<void> {
  try {
    await getRedis().del(`cache:${CACHE_KEY}`);
  } catch {
    /* fail-open */
  }
}
