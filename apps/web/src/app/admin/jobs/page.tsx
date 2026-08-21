'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Search, Download, Check, X, Trash2, Mail, SlidersHorizontal } from 'lucide-react';
import type { SortingState } from '@tanstack/react-table';
import type { JobStatus } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Input } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { AdvancedJobsTable } from '@/components/admin/advanced-jobs-table';
import { BulkEmailDialog } from '@/components/admin/bulk-email-dialog';
import { FilterPanel } from '@/components/admin/filter-panel';
import { StatusTransitionModal } from '@/components/admin/status-transition-modal';
import {
  type AdminFilters,
  activeFilterCount,
  describeFilters,
  toQueryInput,
  filtersToSearchParams,
  filtersFromSearchParams,
} from '@/lib/admin-filters';
import { useBulkSelection, chunk } from '@/hooks/useBulkSelection';
import { useDebounced } from '@/hooks/useDebounced';

/** Server caps one bulk call at 500 ids; batch to that so any selection size works. */
const BULK_BATCH = 500;

export default function AdminJobsPage() {
  const utils = trpc.useUtils();
  // `q` is kept separate from the rest so typing stays instant while only the
  // debounced value reaches the server.
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 300);
  const [filters, setFilters] = useState<AdminFilters>({});
  const [panelOpen, setPanelOpen] = useState(false);
  // Guards the first URL write until the initial read has happened, so an empty
  // initial state can't wipe the query string of a pasted link.
  const urlReady = useRef(false);
  const [busy, setBusy] = useState(false);
  // null = no bulk run in flight; otherwise {done,total} batches for the progress bar.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Everything the server needs, in one place, so the feed / count / facets /
  // select-all-ids queries can never disagree about what "matching" means.
  const active = useMemo<AdminFilters>(
    () => ({ ...filters, q: debouncedQ || undefined }),
    [filters, debouncedQ],
  );
  const queryInput = useMemo(() => toQueryInput(active), [active]);

  // Infinite/virtualized feed — loads 100 rows per scroll instead of all at once.
  const query = trpc.admin.allJobsInfinite.useInfiniteQuery(
    { ...queryInput, limit: 100 },
    { getNextPageParam: (last) => last.nextCursor, initialCursor: 0 },
  );
  const totalQ = trpc.admin.jobCount.useQuery(queryInput);
  const facetsQ = trpc.admin.jobFacets.useQuery(queryInput, { enabled: panelOpen });

  const adminStats = trpc.admin.stats.useQuery();
  const TABS: { label: string; value: string; badge: number }[] = [
    { label: 'All Jobs', value: '', badge: 0 },
    { label: 'Drafts', value: 'draft', badge: adminStats.data?.draftJobs ?? 0 },
    { label: 'Pending', value: 'pending', badge: adminStats.data?.pendingJobs ?? 0 },
    { label: 'Expired', value: 'expired', badge: adminStats.data?.expiredJobs ?? 0 },
  ];
  // A tab is a one-status shortcut into the same status facet the panel edits.
  const tabValue = filters.status?.length === 1 ? filters.status[0]! : '';
  const filterCount = activeFilterCount(active);
  const chips = useMemo(() => describeFilters(active), [active]);

  // ── URL sync ──────────────────────────────────────────────────
  // Read once on mount so a pasted/refreshed link restores its filters.
  useEffect(() => {
    const parsed = filtersFromSearchParams(new URLSearchParams(window.location.search));
    const { q: urlQ, ...rest } = parsed;
    if (urlQ) setQ(urlQ);
    if (Object.keys(rest).length > 0) setFilters(rest);
    urlReady.current = true;
  }, []);

  // Mirror state back into the address bar. replaceState rather than router.replace:
  // filters are view state, not navigation steps — every checkbox tick should not
  // become a back-button entry, and this avoids a re-render per keystroke.
  useEffect(() => {
    if (!urlReady.current) return;
    const qs = filtersToSearchParams(active).toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [active]);

  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const visibleIds = useMemo(() => rows.map((j) => j.id), [rows]);
  const bulk = useBulkSelection(visibleIds);
  const sel = bulk.selected;

  // Ids for the whole filter, not just the loaded page — fetched only when the
  // admin asks to select beyond what's on screen.
  const matching = trpc.admin.jobIdsMatching.useQuery(queryInput, { enabled: false });

  const inval = () => utils.admin.allJobsInfinite.invalidate();
  const feat = trpc.admin.setJobFeatured.useMutation({ onSuccess: () => { inval(); toast.success('Updated'); } });
  const setStatusM = trpc.admin.setJobStatus.useMutation({
    onSuccess: (r) => { inval(); toast.success(r.changed ? 'Status changed' : 'Already in that status'); },
    // The server rejects invalid transitions; surface its explanation verbatim.
    onError: (e) => toast.error(e.message),
  });

  /** Job whose status is being changed — drives the transition modal. */
  const [statusFor, setStatusFor] = useState<string | null>(null);
  const statusJob = useMemo(() => rows.find((j) => j.id === statusFor) ?? null, [rows, statusFor]);

  function confirmStatus(next: JobStatus, reason?: string) {
    if (!statusFor) return;
    setStatusM.mutate(
      { id: statusFor, status: next, reason },
      { onSettled: () => setStatusFor(null) },
    );
  }
  const del = trpc.admin.deleteJob.useMutation();
  const bulkStatusM = trpc.admin.bulkSetJobStatus.useMutation();
  const bulkDeleteM = trpc.admin.bulkDeleteJobs.useMutation();
  const bulkEmailM = trpc.admin.bulkEmailEmployers.useMutation();

  function onDelete(id: string) {
    if (!confirm('Delete this job? This cannot be undone.')) return;
    del.mutate({ id }, { onSuccess: () => { inval(); toast.success('Job deleted'); } });
  }

  /**
   * Run a bulk mutation over the whole selection in server-sized batches.
   *
   * Each batch is ONE request doing ONE SQL statement — batching exists because
   * the server caps a call at 500 ids, not to make per-job calls. A 1,200-job
   * selection is 3 requests, not 1,200.
   */
  async function runBatched(
    ids: string[],
    label: string,
    fn: (batch: string[]) => Promise<{ count: number; skipped?: number }>,
  ) {
    const batches = chunk(ids, BULK_BATCH);
    setBusy(true);
    setProgress({ done: 0, total: batches.length });
    let affected = 0;
    let skipped = 0;
    try {
      for (const [i, batch] of batches.entries()) {
        const r = await fn(batch);
        affected += r.count;
        skipped += r.skipped ?? 0;
        setProgress({ done: i + 1, total: batches.length });
      }
      // Jobs whose current status forbids this move are skipped, not failed —
      // say so explicitly rather than letting the count quietly come up short.
      const note = skipped ? ` · ${skipped} skipped (invalid from their current status)` : '';
      toast.success(`${affected} job${affected === 1 ? '' : 's'} ${label}${note}`);
      bulk.clear();
      inval();
    } catch {
      // Earlier batches already committed — say so rather than implying a clean rollback.
      toast.error(affected ? `Failed after ${affected} job(s) — reload to see current state` : `Bulk ${label} failed`);
      if (affected) inval();
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const bulkStatus = (next: 'active' | 'rejected') =>
    runBatched([...sel], next === 'active' ? 'approved' : 'rejected', (batch) =>
      bulkStatusM.mutateAsync({ ids: batch, status: next }),
    );

  function bulkDelete() {
    if (!confirm(`Delete ${sel.size} job(s)? This cannot be undone.`)) return;
    return runBatched([...sel], 'deleted', (batch) => bulkDeleteM.mutateAsync({ ids: batch }));
  }

  /** Pull every id matching the current filter, then select them all. */
  async function selectAllMatching() {
    const res = await matching.refetch();
    if (!res.data) { toast.error('Could not load matching jobs'); return; }
    bulk.select(res.data.ids);
    toast.success(
      res.data.capped
        ? `Selected the first ${res.data.ids.length} matching jobs (filter is larger)`
        : `Selected all ${res.data.ids.length} matching jobs`,
    );
  }

  async function sendBulkEmail(subject: string, message: string) {
    const batches = chunk([...sel], BULK_BATCH);
    setBusy(true);
    setProgress({ done: 0, total: batches.length });
    let sent = 0;
    let failed = 0;
    try {
      for (const [i, batch] of batches.entries()) {
        const r = await bulkEmailM.mutateAsync({ ids: batch, subject, message });
        sent += r.sent;
        failed += r.failed;
        setProgress({ done: i + 1, total: batches.length });
      }
      toast.success(`Emailed ${sent} employer${sent === 1 ? '' : 's'}${failed ? ` · ${failed} failed` : ''}`);
      setEmailOpen(false);
      bulk.clear();
    } catch {
      toast.error(sent ? `Stopped after ${sent} sent` : 'Bulk email failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function exportCsv() {
    const src = sel.size ? rows.filter((j) => sel.has(j.id)) : rows;
    const head = ['Title', 'Company', 'Status', 'SalaryMin', 'SalaryMax', 'Slug', 'Created'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = src.map((j) =>
      [j.title, j.company?.name ?? '', j.status, j.salaryMin ?? '', j.salaryMax ?? '', j.slug, new Date(j.createdAt).toISOString()].map(esc).join(','),
    );
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `jobs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Jobs</h1>

      {/* Status tabs — horizontal scroll on mobile, teal underline on active. */}
      <div className="mt-4 -mx-1 flex gap-1 overflow-x-auto border-b px-1 scrollbar-hide">
        {TABS.map((t) => {
          const isActive = tabValue === t.value;
          return (
            <button
              key={t.value || 'all'}
              type="button"
              onClick={() => { setFilters((f) => ({ ...f, status: t.value ? [t.value as JobStatus] : undefined })); bulk.clear(); }}
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'text-teal-700' : 'text-navy-700/60 hover:text-navy-900'
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isActive ? 'bg-teal-100 text-teal-700' : 'bg-navy-100 text-navy-700'}`}>
                  {t.badge}
                </span>
              )}
              {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-teal-600" />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-white px-3">
          <Search className="h-4 w-4 text-navy-700/40" />
          <Input
            className="border-0 focus-visible:ring-0"
            placeholder="Search title, description or company…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search" className="text-navy-700/40 hover:text-navy-900">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button variant="outline" onClick={() => setPanelOpen((o) => !o)} aria-expanded={panelOpen}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {filterCount > 0 && (
            <span className="ml-1 rounded-full bg-teal-600 px-1.5 py-0.5 text-xs font-semibold text-white">{filterCount}</span>
          )}
        </Button>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      {/* Applied filters, each individually removable. */}
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-1 text-xs text-navy-800">
              {c.label}
              <button
                aria-label={`Remove filter ${c.label}`}
                onClick={() => {
                  if (c.key === 'q') { setQ(''); return; }
                  setFilters((f) => {
                    const next = { ...f };
                    delete next[c.key];
                    // Salary and date are one chip covering two bounds.
                    if (c.key === 'salaryMin') delete next.salaryMax;
                    if (c.key === 'dateFrom') delete next.dateTo;
                    return next;
                  });
                }}
                className="text-navy-700/50 hover:text-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button className="ml-1 text-xs text-teal-700 hover:underline" onClick={() => { setFilters({}); setQ(''); }}>
            Clear all
          </button>
        </div>
      )}

      {sel.size > 0 && (
        <div className="sticky top-2 z-20 mt-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-navy-900">{sel.size} selected</span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulkStatus('active')}><Check className="h-4 w-4 text-green-600" /> Approve</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulkStatus('rejected')}><X className="h-4 w-4 text-orange-600" /> Reject</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setEmailOpen(true)}><Mail className="h-4 w-4 text-teal-600" /> Email</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={bulkDelete}><Trash2 className="h-4 w-4 text-red-500" /> Delete</Button>
            <button className="ml-auto text-navy-700/60 hover:underline" onClick={bulk.clear}>Clear</button>
          </div>

          {/* Selecting beyond the loaded page — the point of "approve 100+ in one click". */}
          {bulk.allVisibleSelected && (
            <p className="mt-1.5 text-xs text-navy-700/70">
              All {rows.length} loaded jobs are selected.{' '}
              <button
                className="font-semibold text-teal-700 hover:underline disabled:opacity-50"
                onClick={selectAllMatching}
                disabled={matching.isFetching || busy}
              >
                {matching.isFetching ? 'Loading…' : 'Select every job matching this filter'}
              </button>
            </p>
          )}

          {progress && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded bg-teal-100">
                <div
                  className="h-full rounded bg-teal-600 transition-all"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-navy-700/60">
                Batch {progress.done} of {progress.total}
              </p>
            </div>
          )}
        </div>
      )}

      <StatusTransitionModal
        open={!!statusJob}
        jobId={statusJob?.id ?? ''}
        jobTitle={statusJob?.title ?? ''}
        currentStatus={(statusJob?.status ?? 'draft') as JobStatus}
        busy={setStatusM.isPending}
        onClose={() => setStatusFor(null)}
        onConfirm={confirmStatus}
      />

      <BulkEmailDialog
        open={emailOpen}
        count={sel.size}
        busy={busy}
        onClose={() => setEmailOpen(false)}
        onSend={sendBulkEmail}
      />

      {/* Panel sits beside the table on desktop, stacks above it on mobile. */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
        {panelOpen && (
          <FilterPanel
            filters={filters}
            onChange={(next) => { setFilters(next); bulk.clear(); }}
            onClose={() => setPanelOpen(false)}
            facets={facetsQ.data}
            facetsLoading={facetsQ.isLoading}
          />
        )}
        <div className="min-w-0 flex-1">
        {query.isLoading ? (
          <div className="rounded-xl border bg-white p-6"><Loader2 className="animate-spin text-teal-500" /></div>
        ) : (
          <AdvancedJobsTable
            rows={rows}
            sorting={sorting}
            onSortingChange={setSorting}
            selected={sel}
            allSelected={bulk.allVisibleSelected}
            someSelected={bulk.someVisibleSelected}
            onToggleAt={bulk.toggleAt}
            onToggleAll={bulk.toggleAllVisible}
            onFeatured={(id, next) => feat.mutate({ id, featured: next })}
            onStatus={setStatusFor}
            onDelete={onDelete}
            loadMore={() => { void query.fetchNextPage(); }}
            hasMore={!!query.hasNextPage}
            loadingMore={query.isFetchingNextPage}
          />
        )}
        <p className="mt-2 px-1 text-xs text-navy-700/50">
          {totalQ.data
            ? `${totalQ.data.total.toLocaleString()} job${totalQ.data.total === 1 ? '' : 's'} match${filterCount ? ' these filters' : ''}`
            : 'Counting…'}
          {rows.length > 0 && ` · ${rows.length} loaded${query.hasNextPage ? ' · scroll for more' : ''} · sorting applies to loaded rows`}
        </p>
        </div>
      </div>
    </div>
  );
}
