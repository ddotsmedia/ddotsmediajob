'use client';

import { useState, useEffect } from 'react';

export type CompareItem = { slug: string; title: string };
export const MAX_COMPARE = 3;
const KEY = 'ddots-compare';

export function getCompare(): CompareItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as CompareItem[];
  } catch {
    return [];
  }
}

function save(list: CompareItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('compare-change'));
  } catch {
    /* storage unavailable (private mode / restricted webview) — ignore */
  }
}

/** Add/remove a job. Returns { full: true } if the list is already at MAX. */
export function toggleCompare(item: CompareItem): { full: boolean } {
  const list = getCompare();
  const i = list.findIndex((x) => x.slug === item.slug);
  if (i >= 0) {
    list.splice(i, 1);
    save(list);
    return { full: false };
  }
  if (list.length >= MAX_COMPARE) return { full: true };
  list.push(item);
  save(list);
  return { full: false };
}

export function removeCompare(slug: string) {
  save(getCompare().filter((x) => x.slug !== slug));
}

export function clearCompare() {
  save([]);
}

/** Reactive view of the compare list, synced across tabs + components. */
export function useCompare(): CompareItem[] {
  const [list, setList] = useState<CompareItem[]>([]);
  useEffect(() => {
    const sync = () => setList(getCompare());
    sync();
    window.addEventListener('compare-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('compare-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return list;
}
