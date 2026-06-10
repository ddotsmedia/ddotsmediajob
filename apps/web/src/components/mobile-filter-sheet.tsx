'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { JobFilters } from './job-filters';

/** Mobile-only "Filters" button → bottom-sheet drawer wrapping the full filter set. */
export function MobileFilterSheet() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 active:scale-[0.99]"
      >
        <SlidersHorizontal className="h-4 w-4" /> Filters
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40" onClick={() => setOpen(false)}>
          <div className="flex max-h-[85dvh] flex-col overscroll-contain rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="relative shrink-0 border-b px-4 py-3">
              <span className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-navy-200" />
              <div className="flex items-center justify-between pt-1">
                <h3 className="font-display font-bold text-navy-900">Filters</h3>
                <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center"><X className="h-5 w-5 text-navy-500" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              <JobFilters />
            </div>
            <div className="pb-safe sticky bottom-0 shrink-0 border-t bg-white p-4">
              <button onClick={() => setOpen(false)} className="min-h-[48px] w-full rounded-lg bg-teal-600 px-4 py-3 font-semibold text-white active:scale-[0.99]">Show results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
