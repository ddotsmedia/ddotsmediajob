'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { trpc } from '@/trpc/react';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 200;

/**
 * Cmd+K job search for the admin panel, backed by the `search_vector` GIN
 * index (admin.jobsSearch).
 *
 * Deliberately not cmdk/shadcn — neither is installed, and this needs one
 * input, one list and arrow keys. Radix's dialog is a dependency but unused
 * anywhere in the app, so a plain overlay keeps the admin bundle unchanged.
 */
export function JobSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Don't fire a query per keystroke — the palette is open while typing.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  const enabled = debounced.trim().length >= MIN_CHARS;
  const { data, isFetching } = trpc.admin.jobsSearch.useQuery(
    { q: debounced },
    { enabled, staleTime: 30_000 },
  );
  const results = data ?? [];

  // Reset on every open so the palette never reopens showing a stale search.
  useEffect(() => {
    if (!open) return;
    setQ('');
    setDebounced('');
    setActive(0);
    inputRef.current?.focus();
  }, [open]);

  // The highlight indexes into `results`; a new result set can be shorter.
  useEffect(() => {
    setActive(0);
  }, [data]);

  if (!open) return null;

  const go = (id: string) => {
    onOpenChange(false);
    router.push(`/admin/jobs/${id}/edit`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
      return;
    }
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const job = results[active];
      if (job) go(job.id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
      role="presentation"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search jobs"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-navy-700 bg-navy-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-navy-700 px-4">
          <Search className="h-4 w-4 shrink-0 text-navy-100/50" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs by title or description…"
            aria-label="Search jobs"
            maxLength={120}
            className="w-full bg-transparent py-3.5 text-sm text-white placeholder:text-navy-100/40 focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-navy-100/50 sm:block">
            Esc
          </kbd>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {!enabled && (
            <li className="px-4 py-6 text-center text-sm text-navy-100/50">Type at least {MIN_CHARS} characters.</li>
          )}
          {enabled && isFetching && results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-navy-100/50">Searching…</li>
          )}
          {enabled && !isFetching && results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-navy-100/50">No jobs match “{debounced}”.</li>
          )}
          {results.map((job, i) => (
            <li key={job.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(job.id)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === active ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{job.title}</span>
                  <span className="block truncate text-xs text-navy-100/50">
                    {job.companyName ?? 'No company'} · {job.emirateSlug}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase text-navy-100/70">
                  {job.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
