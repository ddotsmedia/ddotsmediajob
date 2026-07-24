import { db, featureFlags } from '@ddots/db';
import { type FlagDecision, flagEnabledFor } from './feature-flags';

/** Cached DB access for feature flags. Cache is cleared on toggle so changes apply immediately. */

type FlagRow = { key: string; enabled: boolean; rolloutPercent: number };
let cache: { rows: FlagRow[]; at: number } | null = null;
const TTL_MS = 30_000;

export function clearFlagCache(): void {
  cache = null;
}

async function loadFlags(): Promise<FlagRow[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const rows = await db
    .select({ key: featureFlags.key, enabled: featureFlags.enabled, rolloutPercent: featureFlags.rolloutPercent })
    .from(featureFlags);
  cache = { rows, at: Date.now() };
  return rows;
}

export async function getFlag(key: string): Promise<FlagDecision> {
  const f = (await loadFlags()).find((x) => x.key === key);
  return f ? { enabled: f.enabled, rolloutPercent: f.rolloutPercent } : { enabled: false, rolloutPercent: 0 };
}

export async function isEnabled(key: string, userId?: string | null): Promise<boolean> {
  return flagEnabledFor(await getFlag(key), key, userId);
}

export async function getAllFlags(): Promise<FlagRow[]> {
  return loadFlags();
}

/** Resolved on/off map for a specific viewer — used by the client context provider. */
export async function resolveForViewer(userId?: string | null): Promise<Record<string, boolean>> {
  const rows = await loadFlags();
  const out: Record<string, boolean> = {};
  for (const f of rows) out[f.key] = flagEnabledFor(f, f.key, userId);
  return out;
}
