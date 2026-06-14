'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { CATEGORIES, EMIRATES, JOB_TYPES, EXPERIENCE_LEVELS, VISA_STATUS } from '@ddots/shared';
import { Label, Select } from '@/components/ui/primitives';

export function JobFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const get = (k: string) => params.get(k) ?? '';
  const toggle = (k: string) => setParam(k, get(k) ? '' : 'true');

  return (
    <aside className="space-y-5 rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-navy-900">Filters</h3>
        <button onClick={() => router.push(pathname)} className="text-xs font-medium text-teal-600 hover:underline">
          Clear all
        </button>
      </div>

      <Field label="When posted">
        <Select value={get('postedWithin')} onChange={(e) => setParam('postedWithin', e.target.value)}>
          <option value="">Any time</option>
          <option value="today">Today</option>
          <option value="3days">Last 3 days</option>
          <option value="week">Last week</option>
          <option value="month">Last month</option>
        </Select>
      </Field>

      <Field label="Category">
        <Select value={get('category')} onChange={(e) => setParam('category', e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="Emirate">
        <Select value={get('emirate')} onChange={(e) => setParam('emirate', e.target.value)}>
          <option value="">All emirates</option>
          {EMIRATES.map((em) => (
            <option key={em.slug} value={em.slug}>{em.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="Job type">
        <Select value={get('jobType')} onChange={(e) => setParam('jobType', e.target.value)}>
          <option value="">Any type</option>
          {JOB_TYPES.map((t) => (
            <option key={t} value={t} className="capitalize">{t.replace('-', ' ')}</option>
          ))}
        </Select>
      </Field>

      <Field label="Experience">
        <Select value={get('experienceLevel')} onChange={(e) => setParam('experienceLevel', e.target.value)}>
          <option value="">Any level</option>
          {EXPERIENCE_LEVELS.map((l) => (
            <option key={l} value={l} className="capitalize">{l.replace(/-/g, ' ')}</option>
          ))}
        </Select>
      </Field>

      <Field label="Visa status">
        <Select value={get('visaStatus')} onChange={(e) => setParam('visaStatus', e.target.value)}>
          <option value="">Any visa</option>
          {VISA_STATUS.map((v) => (
            <option key={v} value={v} className="capitalize">{v.replace(/-/g, ' ')}</option>
          ))}
        </Select>
      </Field>

      <Field label="Minimum salary (AED/mo)">
        <Select value={get('salaryMin')} onChange={(e) => setParam('salaryMin', e.target.value)}>
          <option value="">Any salary</option>
          {[3000, 5000, 8000, 12000, 20000, 30000].map((s) => (
            <option key={s} value={s}>AED {s.toLocaleString('en-AE')}+</option>
          ))}
        </Select>
      </Field>

      <div className="space-y-2 border-t pt-4">
        {([
          ['isRemote', 'Remote only'],
          ['isFresher', 'Fresher friendly'],
          ['isUrgent', 'Urgent hiring'],
          ['freeZone', 'Free zone'],
          ['visaProvided', 'Visa provided'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-navy-700">
            <input
              type="checkbox"
              checked={Boolean(get(key))}
              onChange={() => toggle(key)}
              className="h-4 w-4 rounded border-navy-300 text-teal-600 focus:ring-teal-500"
            />
            {label}
          </label>
        ))}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
