'use client';

import Link from 'next/link';
import { Scale, X, Loader2, Check, Minus } from 'lucide-react';
import { formatSalary, timeAgo, emirateBySlug, categoryBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { useCompare, removeCompare } from '@/lib/compare';

const yn = (v: boolean | null | undefined) => (v ? <Check className="h-4 w-4 text-green-600" /> : <Minus className="h-4 w-4 text-navy-300" />);

export default function ComparePage() {
  const list = useCompare();
  const q = trpc.jobs.bySlugs.useQuery({ slugs: list.map((x) => x.slug) }, { enabled: list.length > 0 });

  const bySlug = new Map((q.data ?? []).map((j) => [j.slug, j]));
  const cols = list.map((x) => bySlug.get(x.slug)).filter((j): j is NonNullable<typeof j> => Boolean(j));

  const rows: { label: string; render: (j: NonNullable<ReturnType<typeof bySlug.get>>) => React.ReactNode }[] = [
    { label: 'Company', render: (j) => (j.isAnonymous ? 'Confidential' : j.company?.name ?? '—') },
    { label: 'Salary', render: (j) => <span className="font-semibold text-teal-700">{formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden)}</span> },
    { label: 'Emirate', render: (j) => emirateBySlug(j.emirateSlug)?.name ?? j.emirateSlug },
    { label: 'Location', render: (j) => j.location ?? '—' },
    { label: 'Type', render: (j) => <span className="capitalize">{j.jobType.replace('-', ' ')}</span> },
    { label: 'Category', render: (j) => categoryBySlug(j.categorySlug)?.name ?? j.categorySlug },
    { label: 'Experience', render: (j) => <span className="capitalize">{(j.experienceLevel ?? '—').toString().replace(/-/g, ' ')}</span> },
    { label: 'Visa provided', render: (j) => yn(j.visaProvided) },
    { label: 'Accommodation', render: (j) => yn(j.accommodationProvided) },
    { label: 'Remote', render: (j) => yn(j.isRemote) },
    { label: 'Freshers welcome', render: (j) => yn(j.isFresher) },
    { label: 'Free zone', render: (j) => (j.freeZone ? j.freeZoneName || 'Yes' : <Minus className="h-4 w-4 text-navy-300" />) },
    { label: 'Posted', render: (j) => timeAgo(j.publishedAt ?? j.createdAt) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2"><Scale className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Compare Jobs</h1></div>
      <p className="text-navy-700/60">Up to 3 jobs side by side.</p>

      {list.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-white p-12 text-center text-navy-700/60">
          No jobs selected. <Link href="/jobs" className="font-semibold text-teal-600 hover:underline">Browse jobs</Link> and tap the compare icon.
        </div>
      ) : q.isLoading ? (
        <Loader2 className="mt-8 animate-spin text-teal-500" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="w-32 px-4 py-3 text-left text-navy-700/60">Job</th>
                {cols.map((j) => (
                  <th key={j.id} className="min-w-[180px] px-4 py-3 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/jobs/${j.slug}`} className="font-display font-bold text-navy-900 hover:text-teal-600">{j.title}</Link>
                      <button onClick={() => removeCompare(j.slug)} aria-label="Remove"><X className="h-4 w-4 text-navy-400 hover:text-red-500" /></button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-700/70">{r.label}</td>
                  {cols.map((j) => <td key={j.id} className="px-4 py-3 text-navy-900">{r.render(j)}</td>)}
                </tr>
              ))}
              <tr>
                <td className="px-4 py-3"></td>
                {cols.map((j) => (
                  <td key={j.id} className="px-4 py-3"><Link href={`/jobs/${j.slug}`} className="inline-block rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700">View &amp; apply</Link></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
