import { useCallback, useEffect, useState } from 'react';
import type { AdminFilters } from '@/lib/admin-filters';

export type SavedFilter = {
  id: string;
  name: string;
  filters: AdminFilters;
  /** ISO string — JSON has no Date type, so storing one and reading it back
   *  yields a string. Keeping it a string avoids a lying `Date` annotation. */
  createdAt: string;
};

const KEY = 'admin-saved-filters';
const MAX_SAVED = 30;

function read(): SavedFilter[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Hand-edited or half-written storage must not take the admin page down.
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is SavedFilter =>
        !!f && typeof f === 'object' && typeof (f as SavedFilter).id === 'string' && typeof (f as SavedFilter).name === 'string',
    );
  } catch {
    console.warn('[saved-filters] ignoring unreadable localStorage entry');
    return [];
  }
}

function write(list: SavedFilter[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch (err) {
    // Quota exceeded or storage disabled — surface it rather than failing mutely.
    console.error('[saved-filters] could not persist', err);
  }
}

/**
 * Filter presets, persisted per browser.
 *
 * Local to the device on purpose: these are one admin's working views, not
 * shared configuration. Moving them server-side would need a table and a
 * sharing model, which nothing has asked for.
 */
export function useSavedFilters() {
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [loaded, setLoaded] = useState(false);

  // localStorage is client-only; read after mount so SSR and first paint agree.
  useEffect(() => {
    setSaved(read());
    setLoaded(true);
  }, []);

  const save = useCallback((name: string, filters: AdminFilters): SavedFilter | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    let created: SavedFilter | null = null;
    // Updater form — computing from the previous state avoids dropping a preset
    // when two saves land in the same render cycle.
    setSaved((prev) => {
      const existingIdx = prev.findIndex((f) => f.name.toLowerCase() === trimmed.toLowerCase());
      created = {
        id: existingIdx >= 0 ? prev[existingIdx]!.id : `${Date.now()}-${prev.length}`,
        name: trimmed,
        filters,
        createdAt: new Date().toISOString(),
      };
      // Saving under an existing name overwrites it rather than making a duplicate.
      const next = existingIdx >= 0 ? prev.map((f, i) => (i === existingIdx ? created! : f)) : [...prev, created];
      const capped = next.slice(-MAX_SAVED);
      write(capped);
      return capped;
    });
    return created;
  }, []);

  const remove = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.filter((f) => f.id !== id);
      write(next);
      return next;
    });
  }, []);

  return { saved, loaded, save, remove };
}
