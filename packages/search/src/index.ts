/**
 * Meilisearch client for DdotsMediaJobs — dependency-free (REST over fetch).
 *
 * Every function degrades gracefully: when MEILISEARCH_URL is unset, or on any
 * network/HTTP error, reads return null/[]/false and writes are no-ops, so
 * callers transparently fall back to the database. Arabic is handled natively —
 * Meilisearch ≥1.x auto-detects language per document, so Arabic job titles are
 * tokenised without extra configuration.
 */

const BASE = process.env.MEILISEARCH_URL?.replace(/\/$/, '');
const KEY = process.env.MEILISEARCH_API_KEY;
const INDEX = 'jobs';

export function isSearchConfigured(): boolean {
  return !!BASE;
}

export type JobDoc = {
  id: string;
  slug: string;
  title: string;
  description: string;
  company: string | null;
  category: string;
  emirate: string;
  jobType: string;
  tags: string[];
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  visaProvided: boolean;
  accommodation: boolean;
  freshersWelcome: boolean;
  urgent: boolean;
  featured: boolean;
  applicantCount: number;
  createdAt: number; // epoch ms — sortable
};

async function mfetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}),
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[meilisearch] ${path} → ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error('[meilisearch] request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Create the jobs index (idempotent) and apply searchable/filterable/sortable settings. */
export async function ensureJobsIndex(): Promise<void> {
  if (!isSearchConfigured()) return;
  await mfetch('/indexes', { method: 'POST', body: JSON.stringify({ uid: INDEX, primaryKey: 'id' }) });
  await mfetch(`/indexes/${INDEX}/settings`, {
    method: 'PATCH',
    body: JSON.stringify({
      searchableAttributes: ['title', 'description', 'company', 'category', 'emirate', 'tags'],
      filterableAttributes: [
        'status', 'category', 'emirate', 'jobType', 'salaryMin', 'salaryMax',
        'visaProvided', 'accommodation', 'freshersWelcome', 'urgent', 'featured',
      ],
      sortableAttributes: ['createdAt', 'salaryMin', 'salaryMax', 'applicantCount'],
      rankingRules: ['typo', 'words', 'proximity', 'attribute', 'sort', 'exactness'],
    }),
  });
}

export async function upsertJob(doc: JobDoc): Promise<void> {
  if (!isSearchConfigured()) return;
  await mfetch(`/indexes/${INDEX}/documents`, { method: 'PUT', body: JSON.stringify([doc]) });
}

export async function bulkUpsert(docs: JobDoc[]): Promise<void> {
  if (!isSearchConfigured() || !docs.length) return;
  await mfetch(`/indexes/${INDEX}/documents`, { method: 'PUT', body: JSON.stringify(docs) });
}

export async function deleteJob(id: string): Promise<void> {
  if (!isSearchConfigured()) return;
  await mfetch(`/indexes/${INDEX}/documents/${id}`, { method: 'DELETE' });
}

export type SearchParams = {
  q?: string;
  filters?: string[]; // Meili filter expressions, AND-ed together (status=active is always added)
  sort?: string[]; // e.g. ['salaryMax:desc']
  limit?: number;
  offset?: number;
};

/** Returns ordered job ids + estimated total, or null when search is unavailable. */
export async function searchJobs(p: SearchParams): Promise<{ ids: string[]; total: number } | null> {
  if (!isSearchConfigured()) return null;
  const filter = ['status = active', ...(p.filters ?? [])].join(' AND ');
  const body: Record<string, unknown> = {
    q: p.q ?? '',
    filter,
    limit: p.limit ?? 20,
    offset: p.offset ?? 0,
    attributesToRetrieve: ['id'],
  };
  if (p.sort?.length) body.sort = p.sort;
  const res = await mfetch<{ hits: { id: string }[]; estimatedTotalHits: number }>(
    `/indexes/${INDEX}/search`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (!res) return null;
  return { ids: res.hits.map((h) => h.id), total: res.estimatedTotalHits };
}

/** Autocomplete suggestions (distinct job titles). Empty array on failure. */
export async function suggest(q: string, limit = 6): Promise<string[]> {
  if (!isSearchConfigured() || !q.trim()) return [];
  const res = await mfetch<{ hits: { title: string }[] }>(`/indexes/${INDEX}/search`, {
    method: 'POST',
    body: JSON.stringify({ q, limit, attributesToRetrieve: ['title'], filter: 'status = active' }),
  });
  if (!res) return [];
  return [...new Set(res.hits.map((h) => h.title))];
}

export async function ping(): Promise<boolean> {
  if (!isSearchConfigured()) return false;
  return !!(await mfetch<{ status: string }>('/health'));
}

export async function indexCount(): Promise<number | null> {
  if (!isSearchConfigured()) return null;
  const stats = await mfetch<{ numberOfDocuments: number }>(`/indexes/${INDEX}/stats`);
  return stats?.numberOfDocuments ?? null;
}
