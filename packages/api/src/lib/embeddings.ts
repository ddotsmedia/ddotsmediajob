/**
 * Semantic matching via pgvector + Gemini embeddings (text-embedding-004, 768-dim, free).
 * ENTIRELY conditional: if the `vector` extension isn't installed, every function
 * is a safe no-op — no migration is shipped, so a missing extension can never
 * break a deploy. Columns are added at runtime (guarded) only when present.
 */
import { db, sql } from '@ddots/db';

const GEMINI_KEY = process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

/** Cached check: is the pgvector extension installed? */
let vectorReadyCache: boolean | null = null;
export async function vectorAvailable(): Promise<boolean> {
  if (vectorReadyCache !== null) return vectorReadyCache;
  try {
    const rows = (await db.execute(sql`SELECT 1 FROM pg_extension WHERE extname = 'vector'`)) as unknown as { length?: number } & unknown[];
    vectorReadyCache = Array.isArray(rows) ? rows.length > 0 : !!(rows as { rowCount?: number }).rowCount;
  } catch {
    vectorReadyCache = false;
  }
  return vectorReadyCache;
}

/** Add the embedding column if (and only if) pgvector is installed. Idempotent, safe. */
export async function ensureVectorSetup(): Promise<boolean> {
  if (!(await vectorAvailable())) return false;
  try {
    await db.execute(sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding vector(768)`);
    return true;
  } catch (err) {
    console.error('[embeddings] setup failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

/** Gemini embedding (768-dim). Returns null when unconfigured or on error. */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!GEMINI_KEY || !text.trim()) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: text.slice(0, 8000) }] } }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { embedding?: { values?: number[] } };
    return json.embedding?.values ?? null;
  } catch {
    return null;
  }
}

const toVec = (e: number[]) => `[${e.join(',')}]`;

/** Store a job's embedding (no-op if vector/key unavailable). */
export async function upsertJobEmbedding(jobId: string, text: string): Promise<void> {
  if (!(await ensureVectorSetup())) return;
  const e = await generateEmbedding(text);
  if (!e) return;
  await db.execute(sql`UPDATE jobs SET embedding = ${toVec(e)}::vector WHERE id = ${jobId}`);
}

/** Return ids of jobs most similar to the given job (cosine). Empty when unavailable. */
export async function similarJobIds(jobId: string, limit = 6): Promise<string[]> {
  if (!(await vectorAvailable())) return [];
  try {
    const rows = (await db.execute(sql`
      SELECT id FROM jobs
      WHERE status = 'active' AND embedding IS NOT NULL AND id <> ${jobId}
      ORDER BY embedding <=> (SELECT embedding FROM jobs WHERE id = ${jobId})
      LIMIT ${limit}
    `)) as unknown as { id: string }[];
    return (Array.isArray(rows) ? rows : []).map((r) => r.id);
  } catch {
    return [];
  }
}
