'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { flexRender, type SortingState, type OnChangeFn } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Star, Pencil, ExternalLink, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { formatSalary, formatShort, getJobEmoji } from '@ddots/shared';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { SourceBadge } from '@/components/source-badge';
import { StatusBadge, statusLabel } from '@/components/admin/status-badge';
import { isTerminal as terminal } from '@/lib/job-status-machine';
import { useAdvancedJobsTable, type AdminJob } from '@/hooks/useAdvancedJobsTable';

export type { AdminJob };

// Shared grid template so the sticky header and every virtual row stay aligned.
// One track per column in useAdvancedJobsTable's COLUMNS, in the same order.
// min-width forces horizontal scroll on small screens rather than squashing.
// formatShort renders a full "8 Jul 2024, 12:00 PM", so Posted needs ~150px.
const GRID = '44px minmax(240px,2.2fr) 1.2fr 150px 108px 150px 64px 152px 128px';

type Props = {
  rows: AdminJob[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  selected: Set<string>;
  allSelected: boolean;
  /** Some but not all visible rows selected — renders the header box indeterminate. */
  someSelected?: boolean;
  /** Toggle by position in the *sorted* order, so shift-click ranges match what's on screen. */
  onToggleAt: (index: number, orderedIds: string[], shiftKey: boolean) => void;
  onToggleAll: () => void;
  onFeatured: (id: string, next: boolean) => void;
  /** Open the status-transition modal for this job. */
  onStatus: (id: string) => void;
  onDelete: (id: string) => void;
  loadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
};

export function AdvancedJobsTable({
  rows, sorting, onSortingChange, selected, allSelected, someSelected,
  onToggleAt, onToggleAll, onFeatured, onStatus, onDelete,
  loadMore, hasMore, loadingMore,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerBoxRef = useRef<HTMLInputElement>(null);

  // Client-side sort over the rows loaded so far (admin loads ~100/scroll).
  const table = useAdvancedJobsTable({ data: rows, sorting, onSortingChange });
  const sortedRows = table.getRowModel().rows;

  // Shift-click ranges follow the on-screen order, which is the sorted order.
  const orderedIds = useMemo(() => sortedRows.map((r) => r.original.id), [sortedRows]);

  // `indeterminate` is a DOM property with no JSX attribute — must be set imperatively.
  useEffect(() => {
    if (headerBoxRef.current) headerBoxRef.current.indeterminate = !!someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
    overscan: 8,
  });

  // Infinite load: fetch the next page as the scroll nears the bottom.
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (hasMore && !loadingMore && el.scrollHeight - el.scrollTop - el.clientHeight < 320) loadMore();
    },
    [hasMore, loadingMore, loadMore],
  );

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <div className="min-w-[1000px]">
        {/* Header — driven by the table's own columns so it can't drift from the rows. */}
        {table.getHeaderGroups().map((hg) => (
          <div
            key={hg.id}
            className="sticky top-0 z-10 grid border-b bg-navy-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700"
            style={{ gridTemplateColumns: GRID }}
          >
            {hg.headers.map((header) => {
              const sorted = header.column.getIsSorted();
              return (
                <div key={header.id} className="px-3 py-3">
                  {header.id === '_sel' ? (
                    <input ref={headerBoxRef} type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all loaded rows" />
                  ) : header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="flex items-center gap-1 hover:text-navy-900"
                      aria-label={`Sort by ${String(header.column.columnDef.header)}`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === 'desc' ? <ChevronDown className="h-3.5 w-3.5" /> : sorted === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : null}
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Virtualized body */}
        <div ref={scrollRef} onScroll={onScroll} className="max-h-[65vh] overflow-y-auto">
          {sortedRows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-navy-700/60">No jobs.</div>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((vr) => {
                const j = sortedRows[vr.index]!.original;
                const isSel = selected.has(j.id);
                return (
                  <div
                    key={j.id}
                    data-index={vr.index}
                    data-selected={isSel || undefined}
                    ref={virtualizer.measureElement}
                    className={`absolute inset-x-0 grid items-center border-b text-sm ${
                      isSel ? 'bg-teal-50 ring-1 ring-inset ring-teal-200' : 'hover:bg-teal-50/40'
                    }`}
                    style={{ gridTemplateColumns: GRID, transform: `translateY(${vr.start}px)` }}
                  >
                    <div className="px-3 py-3">
                      {/* onClick (not onChange) carries shiftKey; onChange keeps it keyboard-operable. */}
                      <input
                        type="checkbox"
                        checked={isSel}
                        onClick={(e) => onToggleAt(vr.index, orderedIds, e.shiftKey)}
                        onChange={() => {}}
                        aria-label={`Select ${j.title}`}
                      />
                    </div>
                    <div className="truncate px-3 py-3 font-medium text-navy-900" title={j.title}>
                      {getJobEmoji(j.title, j.categorySlug)} {j.title} {j.isFeatured && <Badge className="ml-1">★</Badge>}
                    </div>
                    <div className="truncate px-3 py-3 text-navy-700/70" title={j.company?.name ?? ''}>{j.company?.name ?? '—'}</div>
                    <div className="truncate px-3 py-3 text-navy-700/60" title={formatShort(j.publishedAt ?? j.createdAt)}>
                      {formatShort(j.publishedAt ?? j.createdAt)}
                    </div>
                    <div className="px-3 py-3"><SourceBadge source={j.source} /></div>
                    <div className="truncate px-3 py-3 text-navy-700/70">{formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden, j.salaryNegotiable)}</div>
                    <div className="px-3 py-3 text-navy-700/60">{j.viewCount ?? 0}</div>
                    <div className="px-3 py-3">
                      {/* Opens the transition modal, which offers only the moves the
                          state machine permits and captures a reason. Terminal
                          statuses render as a plain badge with nothing to click. */}
                      {terminal(j.status) ? (
                        <StatusBadge status={j.status} title={`${statusLabel(j.status)} is terminal — no further changes`} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStatus(j.id)}
                          title={`Change status from ${statusLabel(j.status)}`}
                          aria-label={`Change status of ${j.title}, currently ${statusLabel(j.status)}`}
                          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                          <StatusBadge status={j.status} className="cursor-pointer hover:ring-2 hover:ring-teal-300" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-0.5 px-2 py-3">
                      <Button variant="ghost" size="icon" onClick={() => onFeatured(j.id, !j.isFeatured)} title="Toggle featured">
                        <Star className={j.isFeatured ? 'fill-gold-500 text-gold-500' : ''} />
                      </Button>
                      <Button asChild variant="ghost" size="icon" title="Edit"><Link href={`/admin/jobs/${j.id}/edit`}><Pencil /></Link></Button>
                      <Button asChild variant="ghost" size="icon" title="Preview"><Link href={`/jobs/${j.slug}`} target="_blank"><ExternalLink /></Link></Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => onDelete(j.id)}><Trash2 className="text-red-500" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-navy-700/60">
              <Loader2 className="h-4 w-4 animate-spin text-teal-500" /> Loading more…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
