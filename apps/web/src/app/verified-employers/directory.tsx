'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, BadgeCheck, Loader2 } from 'lucide-react';
import { CATEGORIES, EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';

const SIZES = ['1-10', '11-50', '51-200', '201-500', '500-1000', '1000-plus'];

export function VerifiedDirectory() {
  const [industry, setIndustry] = useState('');
  const [emirate, setEmirate] = useState('');
  const [size, setSize] = useState('');
  const [hiringNow, setHiringNow] = useState(false);
  const q = trpc.content.verifiedEmployers.useQuery({
    industry: industry || undefined,
    emirate: emirate || undefined,
    size: size || undefined,
    hiringNow: hiringNow || undefined,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All industries</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
        </select>
        <select value={emirate} onChange={(e) => setEmirate(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All emirates</option>
          {EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">Any size</option>
          {SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
        </select>
        <label className="ml-auto inline-flex items-center gap-2 text-sm font-medium text-navy-700">
          <input type="checkbox" checked={hiringNow} onChange={(e) => setHiringNow(e.target.checked)} className="h-4 w-4 rounded text-teal-600" /> Hiring now
        </label>
      </div>

      <div className="mt-5">
        {q.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-teal-500" /></div>
        ) : !q.data?.length ? (
          <p className="rounded-xl border border-dashed bg-white py-16 text-center text-navy-700/60">No verified employers match these filters yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {q.data.map((c) => (
              <div key={c.id} className="flex flex-col rounded-xl border bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-navy-50">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-teal-600" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate font-semibold text-navy-900">{c.name} <BadgeCheck className="h-4 w-4 shrink-0 text-teal-500" /></p>
                    <p className="truncate text-xs text-navy-700/60">{c.industry}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-navy-700/70">{c.openJobs} open role{c.openJobs === 1 ? '' : 's'}</p>
                <Link href={`/companies/${c.slug}`} className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-teal-700">View Jobs</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
