/**
 * Cloudflare Workers AI client wrapper. Graceful: when CLOUDFLARE_WORKER_URL is
 * unset, every call is a no-op returning null — the feature is simply disabled.
 * The actual Worker (llama-3.1-8b-instruct) is deployed separately via wrangler.
 */
const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;

export function isCfAiConfigured(): boolean {
  return !!WORKER_URL;
}

async function call<T>(path: string, body: unknown): Promise<T | null> {
  if (!WORKER_URL) return null;
  try {
    const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error('[cf-ai] request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Edge job classification. Returns null when CF Workers AI isn't configured. */
export async function classifyJobAtEdge(text: string): Promise<{ category: string; level: string; confidence?: number } | null> {
  return call('/classify', { text: text.slice(0, 4000) });
}

/** Edge spam/scam check for community content. Returns null when unconfigured. */
export async function spamCheckAtEdge(text: string): Promise<{ spam: boolean; reason?: string } | null> {
  return call('/spam', { text: text.slice(0, 4000) });
}
