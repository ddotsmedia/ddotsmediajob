// Single source of truth for guest job bookmarks (localStorage). Shared by
// SaveJobButton and the header SavedJobsIndicator so the storage key + event
// name are never duplicated as magic strings. SSR-safe: every reader guards
// `window`. Signed-in users also have the DB-backed /dashboard/saved list — this
// is the zero-friction, no-auth layer.
export const SAVED_KEY = 'ddots:saved-jobs';
export const SAVED_EVENT = 'ddots:saved-jobs-changed';

/** Current saved job slugs. Returns [] on server or on any parse/read error. */
export function readSavedJobs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isJobSaved(slug: string): boolean {
  return readSavedJobs().includes(slug);
}

export function savedJobsCount(): number {
  return readSavedJobs().length;
}

/**
 * Toggle a slug's saved state, persist, and notify all listeners (this tab via
 * SAVED_EVENT; other tabs via the native 'storage' event). Returns the new saved
 * state. No-ops safely if storage is unavailable (private mode / quota).
 */
export function toggleSavedJob(slug: string): boolean {
  const cur = readSavedJobs();
  const nowSaved = !cur.includes(slug);
  const next = nowSaved ? [...cur, slug] : cur.filter((s) => s !== slug);
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {
    /* fail silently — caller still reflects intent via the returned value */
  }
  window.dispatchEvent(new Event(SAVED_EVENT));
  return nowSaved;
}

/**
 * Subscribe to saved-list changes (same tab + cross-tab). Returns an unsubscribe
 * function. Callback is invoked on every change; read the fresh value inside it.
 */
export function subscribeSavedJobs(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SAVED_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SAVED_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
