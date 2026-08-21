'use client';

import { useEffect, useState } from 'react';
import { X, RotateCcw, Bookmark, Trash2 } from 'lucide-react';
import type { JobStatus } from '@ddots/shared';
import {
  type AdminFilters,
  EMPTY_FILTERS,
  STATUS_OPTIONS,
  EMIRATE_OPTIONS,
  toggleValue,
  activeFilterCount,
} from '@/lib/admin-filters';
import { Input } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { useSavedFilters } from '@/hooks/useSavedFilters';

type Counts = Record<string, number> | undefined;

type Props = {
  filters: AdminFilters;
  onChange: (next: AdminFilters) => void;
  onClose: () => void;
  /** Per-value result counts, each computed ignoring its own facet. */
  facets?: { status: Counts; emirate: Counts };
  facetsLoading?: boolean;
};

function FacetGroup({
  title,
  options,
  selected,
  counts,
  onToggle,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  counts: Counts;
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="mb-5">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700">{title}</legend>
      <div className="space-y-1.5">
        {options.map((o) => {
          const n = counts?.[o.value];
          // Zero-count values stay visible but muted: hiding them makes the
          // facet list jump around as you filter.
          const empty = counts !== undefined && !n;
          return (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => onToggle(o.value)}
              />
              <span className={empty ? 'text-navy-700/40' : 'text-navy-800'}>{o.label}</span>
              {counts !== undefined && (
                <span className={`ml-auto text-xs tabular-nums ${empty ? 'text-navy-700/30' : 'text-navy-700/60'}`}>
                  {n ?? 0}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FilterPanel({ filters, onChange, onClose, facets, facetsLoading }: Props) {
  const { saved, save, remove } = useSavedFilters();
  const [presetName, setPresetName] = useState('');

  // Escape closes the panel, as with any dismissible overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Edits apply immediately — there is no local draft to fall out of sync with
  // the parent, which is what makes "load a preset" update the panel correctly.
  const set = (patch: Partial<AdminFilters>) => onChange({ ...filters, ...patch });

  const num = (v: string): number | undefined => {
    if (v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };

  const count = activeFilterCount(filters);
  const salaryInverted =
    filters.salaryMin !== undefined && filters.salaryMax !== undefined && filters.salaryMin > filters.salaryMax;

  return (
    <aside className="w-full shrink-0 rounded-xl border bg-white p-4 shadow-sm sm:w-72" aria-label="Job filters">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display font-semibold text-navy-900">
          Filters{count > 0 && <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-800">{count}</span>}
        </h2>
        <button onClick={onClose} aria-label="Close filters" className="text-navy-700/50 hover:text-navy-900">
          <X className="h-4 w-4" />
        </button>
      </div>

      <FacetGroup
        title="Status"
        options={STATUS_OPTIONS}
        selected={filters.status ?? []}
        counts={facetsLoading ? undefined : facets?.status}
        onToggle={(v) => set({ status: toggleValue(filters.status, v as JobStatus) })}
      />

      <FacetGroup
        title="Emirate"
        options={EMIRATE_OPTIONS}
        selected={filters.emirate ?? []}
        counts={facetsLoading ? undefined : facets?.emirate}
        onToggle={(v) => set({ emirate: toggleValue(filters.emirate, v) })}
      />

      <fieldset className="mb-5">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700">Salary (AED)</legend>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Min"
            aria-label="Minimum salary"
            value={filters.salaryMin ?? ''}
            onChange={(e) => set({ salaryMin: num(e.target.value) })}
          />
          <span className="text-navy-700/40">–</span>
          <Input
            type="number"
            min={0}
            placeholder="Max"
            aria-label="Maximum salary"
            value={filters.salaryMax ?? ''}
            onChange={(e) => set({ salaryMax: num(e.target.value) })}
          />
        </div>
        {salaryInverted && (
          <p className="mt-1 text-xs text-orange-700">Minimum is above maximum — no job can match.</p>
        )}
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-navy-800">
          <input
            type="checkbox"
            checked={!!filters.salaryDisclosedOnly}
            onChange={(e) => set({ salaryDisclosedOnly: e.target.checked || undefined })}
          />
          Salary disclosed only
        </label>
      </fieldset>

      <fieldset className="mb-5">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700">Company</legend>
        <Input
          placeholder="Company name contains…"
          aria-label="Company name"
          value={filters.company ?? ''}
          onChange={(e) => set({ company: e.target.value || undefined })}
        />
      </fieldset>

      <fieldset className="mb-5">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700">Posted between</legend>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Posted from"
            value={filters.dateFrom ?? ''}
            onChange={(e) => set({ dateFrom: e.target.value || undefined })}
          />
          <Input
            type="date"
            aria-label="Posted to"
            value={filters.dateTo ?? ''}
            onChange={(e) => set({ dateTo: e.target.value || undefined })}
          />
        </div>
      </fieldset>

      <Button variant="outline" className="w-full" onClick={() => onChange(EMPTY_FILTERS)} disabled={count === 0}>
        <RotateCcw className="h-4 w-4" /> Reset all
      </Button>

      {/* Presets */}
      <div className="mt-5 border-t pt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700">Saved views</h3>
        {saved.length === 0 && <p className="mb-2 text-xs text-navy-700/50">None saved yet.</p>}
        <ul className="mb-3 space-y-1">
          {saved.map((f) => (
            <li key={f.id} className="flex items-center gap-1">
              <button
                onClick={() => onChange(f.filters)}
                className="flex-1 truncate rounded px-2 py-1 text-left text-sm text-navy-800 hover:bg-teal-50"
                title={`Apply “${f.name}”`}
              >
                {f.name}
              </button>
              <button
                onClick={() => remove(f.id)}
                aria-label={`Delete saved view ${f.name}`}
                className="rounded p-1 text-navy-700/40 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <Input
            placeholder="Save current as…"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && presetName.trim()) { save(presetName, filters); setPresetName(''); }
            }}
          />
          <Button
            variant="outline"
            disabled={!presetName.trim() || count === 0}
            title={count === 0 ? 'Apply some filters first' : 'Save these filters'}
            onClick={() => { save(presetName, filters); setPresetName(''); }}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
