import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type OnChangeFn,
  type Table,
} from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@ddots/api';

export type AdminJob = inferRouterOutputs<AppRouter>['admin']['allJobsInfinite']['items'][number];

// Every accessor returns `string | number` so the whole column list shares one
// TValue — keeps the array typed as ColumnDef<AdminJob, string | number>[]
// without an `any` escape hatch (CLAUDE.md: TypeScript strict, no any).
type CellValue = string | number;

const col = createColumnHelper<AdminJob>();

/**
 * Sort keys, kept as pure functions so they can be unit-tested without mounting
 * the table. Each returns the value the column actually sorts on — never the
 * formatted display string, which would sort "3d ago" alphabetically.
 */
export const sortAccessors = {
  title: (r: AdminJob): CellValue => r.title,
  company: (r: AdminJob): CellValue => r.company?.name ?? '',
  posted: (r: AdminJob): CellValue => new Date(r.publishedAt ?? r.createdAt).getTime(),
  // Hidden salaries sort below every real figure rather than mixing in as 0.
  salary: (r: AdminJob): CellValue => (r.salaryHidden ? -1 : (r.salaryMin ?? r.salaryMax ?? 0)),
  views: (r: AdminJob): CellValue => r.viewCount ?? 0,
} as const;

/**
 * Column order here IS the render order — the sticky header maps over these and
 * each virtual row lays out against the same CSS grid template, so adding a
 * column means adding a track to GRID in advanced-jobs-table.tsx.
 *
 * Display columns (`_sel`, `source`, `status`, `_act`) exist only so the header
 * row and the grid stay in lockstep; their cells are rendered by hand in the
 * component to keep the interactive controls fully typed.
 */
const COLUMNS: ColumnDef<AdminJob, CellValue>[] = [
  col.display({ id: '_sel', header: '', enableSorting: false }),
  col.accessor(sortAccessors.title, {
    id: 'title',
    header: 'Title',
    enableSorting: true,
  }),
  col.accessor(sortAccessors.company, {
    id: 'company',
    header: 'Company',
    enableSorting: true,
  }),
  col.accessor(sortAccessors.posted, {
    id: 'posted',
    header: 'Posted',
    enableSorting: true,
    sortingFn: 'basic',
    sortDescFirst: true,
  }),
  col.display({ id: 'source', header: 'Source', enableSorting: false }),
  col.accessor(sortAccessors.salary, {
    id: 'salary',
    header: 'Salary',
    enableSorting: true,
    sortingFn: 'basic',
    sortDescFirst: true,
  }),
  col.accessor(sortAccessors.views, {
    id: 'views',
    header: 'Views',
    enableSorting: true,
    sortingFn: 'basic',
    sortDescFirst: true,
  }),
  col.display({ id: 'status', header: 'Status', enableSorting: false }),
  col.display({ id: '_act', header: '', enableSorting: false }),
];

type UseAdvancedJobsTableProps = {
  /** Rows loaded so far by the infinite query (~100 per scroll). */
  data: AdminJob[];
  /** Sorting is controlled by the page so it survives re-fetches. */
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
};

/**
 * Table instance for the admin jobs list: client-side sorting over the rows the
 * infinite query has loaded. Filtering and paging stay server-side (see
 * admin.allJobsInfinite) so 10k+ jobs never reach the browser at once.
 */
export function useAdvancedJobsTable({
  data,
  sorting,
  onSortingChange,
}: UseAdvancedJobsTableProps): Table<AdminJob> {
  // Stable reference — a fresh columns array each render resets column state.
  const columns = useMemo(() => COLUMNS, []);

  return useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Third click on a header clears the sort and restores newest-first.
    enableSortingRemoval: true,
    getRowId: (row) => row.id,
  });
}
