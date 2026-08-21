import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Selection state for a bulk-action table.
 *
 * Scoped to the page that owns the list rather than lifted into a React context
 * on the admin layout: a layout-level provider survives navigation, so a
 * selection made on /admin/jobs would still be live (and actionable) after
 * moving to /admin/users, where those ids mean something else entirely.
 *
 * Ids are stored as strings — every entity in this schema is a uuid.
 */
export type BulkSelection = {
  selected: Set<string>;
  count: number;
  isSelected: (id: string) => boolean;
  /** All currently-visible rows are selected. False when the list is empty. */
  allVisibleSelected: boolean;
  /** Some but not all — drives the checkbox's indeterminate state. */
  someVisibleSelected: boolean;
  /** Toggle one row by id. */
  toggle: (id: string) => void;
  /**
   * Toggle the row at `index` within `orderedIds` (the rows as displayed, after
   * sorting). With shiftKey held, selects everything between the previously
   * clicked row and this one instead — the usual way to grab 100 rows at once.
   */
  toggleAt: (index: number, orderedIds: string[], shiftKey: boolean) => void;
  /** Select every visible row, or deselect them if all are selected already. */
  toggleAllVisible: () => void;
  /** Replace the selection (used by "select all N matching this filter"). */
  select: (ids: string[]) => void;
  clear: () => void;
};

export function useBulkSelection(visibleIds: string[]): BulkSelection {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Index of the last clicked row, so shift-click knows where the range starts.
  const anchor = useRef<number | null>(null);

  const visibleKey = visibleIds.join(',');
  const { allVisibleSelected, someVisibleSelected } = useMemo(() => {
    if (visibleIds.length === 0) return { allVisibleSelected: false, someVisibleSelected: false };
    let hits = 0;
    for (const id of visibleIds) if (selected.has(id)) hits++;
    return {
      allVisibleSelected: hits === visibleIds.length,
      someVisibleSelected: hits > 0 && hits < visibleIds.length,
    };
    // visibleKey stands in for visibleIds — a fresh array each render would thrash this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAt = useCallback((index: number, orderedIds: string[], shiftKey: boolean) => {
    const id = orderedIds[index];
    if (id === undefined) return;

    // Shift-click extends from the last plain click; without an anchor it
    // degrades to a normal toggle rather than doing something surprising.
    if (shiftKey && anchor.current !== null) {
      const from = anchor.current;
      const [lo, hi] = from <= index ? [from, index] : [index, from];
      const range = orderedIds.slice(lo, hi + 1);
      // Shift-click always adds, as in Gmail/Finder — predictable when the range
      // spans rows that are already a mix of selected and not.
      setSelected((prev) => {
        const next = new Set(prev);
        for (const rid of range) next.add(rid);
        return next;
      });
      anchor.current = index;
      return;
    }

    anchor.current = index;
    toggle(id);
  }, [toggle]);

  const select = useCallback((ids: string[]) => setSelected(new Set(ids)), []);

  const clear = useCallback(() => {
    setSelected(new Set());
    anchor.current = null;
  }, []);

  const toggleAllVisible = useCallback(() => {
    setSelected((prev) => {
      const everySelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      if (everySelected) {
        // Deselect only the visible rows — a wider "select all matching" selection
        // must not be silently discarded by unticking the header box.
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  return {
    selected,
    count: selected.size,
    isSelected: useCallback((id: string) => selected.has(id), [selected]),
    allVisibleSelected,
    someVisibleSelected,
    toggle,
    toggleAt,
    toggleAllVisible,
    select,
    clear,
  };
}

/**
 * Split a selection into request-sized batches. The server caps one bulk call
 * at 500 ids, so selecting 1,200 jobs must become three calls — and the caller
 * gets a real per-chunk progress signal instead of a single opaque wait.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error('chunk size must be >= 1');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
