/**
 * Feature-flag decision logic — PURE (no DB import), so it is unit-testable in isolation.
 * The cached DB wrappers live in ./feature-flags-server.ts.
 */

export type FlagDecision = { enabled: boolean; rolloutPercent: number };

/** Deterministic 0–99 bucket from key+userId (FNV-1a) — stable per user, no crypto dep. */
export function rolloutBucket(key: string, userId: string): number {
  const s = `${key}:${userId}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100;
}

/** Pure: resolve a flag for a viewer. Anonymous users only get fully-rolled-out flags. */
export function flagEnabledFor(flag: FlagDecision, key: string, userId?: string | null): boolean {
  if (!flag.enabled) return false;
  if (flag.rolloutPercent >= 100) return true;
  if (flag.rolloutPercent <= 0) return false;
  if (!userId) return false;
  return rolloutBucket(key, userId) < flag.rolloutPercent;
}
