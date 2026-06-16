'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, TrendingUp } from 'lucide-react';
import { EMIRATES, CATEGORIES, formatSalary } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/primitives';

export function SalaryComparisonClient() {
  const [f, setF] = useState({ title: '', salary: '', emirateSlug: '', categorySlug: '' });
  const [args, setArgs] = useState<{ title: string; salary: number; emirateSlug?: string; categorySlug?: string } | null>(null);
  const q = trpc.content.salaryCompare.useQuery(args!, { enabled: !!args });

  function run() {
    const salary = Number(f.salary);
    if (f.title.trim().length < 2) return toast.error('Enter a job title');
    if (!salary || salary < 500) return toast.error('Enter your monthly salary in AED');
    setArgs({ title: f.title.trim(), salary, emirateSlug: f.emirateSlug || undefined, categorySlug: f.categorySlug || undefined });
  }

  const m = q.data?.market;
  const verdict = q.data?.verdict;
  const userSalary = args?.salary ?? 0;
  // Bar scale: use market max (or user salary) as 100%.
  const scaleMax = Math.max(m?.max ?? 0, userSalary, 1);
  const pct = (n: number) => `${Math.round((n / scaleMax) * 100)}%`;

  const verdictText: Record<string, { label: string; cls: string }> = {
    above: { label: '🎉 You are paid ABOVE market', cls: 'bg-green-50 text-green-700 border-green-300' },
    at: { label: '✅ You are paid AT market', cls: 'bg-teal-50 text-teal-700 border-teal-300' },
    below: { label: '⚠ You are paid BELOW market', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
    no_data: { label: 'No market data yet for this role', cls: 'bg-navy-50 text-navy-600 border-navy-200' },
  };

  function shareWhatsApp() {
    if (!m || !verdict) return;
    const text = `My UAE salary check (${f.title}): I earn AED ${userSalary.toLocaleString('en-AE')}/mo. Market avg AED ${m.avg.toLocaleString('en-AE')} — ${verdict.toUpperCase()}. Check yours on DdotsMediaJobs.com/tools/salary-comparison`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Job title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Accountant" /></div>
          <div className="space-y-1.5"><Label>Your salary (AED/month)</Label><Input type="number" value={f.salary} onChange={(e) => setF({ ...f, salary: e.target.value })} placeholder="8000" /></div>
          <div className="space-y-1.5"><Label>Emirate</Label><Select value={f.emirateSlug} onChange={(e) => setF({ ...f, emirateSlug: e.target.value })}><option value="">Any</option>{EMIRATES.map((e2) => <option key={e2.slug} value={e2.slug}>{e2.name}</option>)}</Select></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Category (for matching jobs)</Label><Select value={f.categorySlug} onChange={(e) => setF({ ...f, categorySlug: e.target.value })}><option value="">Auto</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></div>
        </div>
        <Button className="mt-4 w-full" onClick={run} disabled={q.isFetching && !!args}>
          {q.isFetching && args ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />} Compare my salary
        </Button>
      </div>

      {q.data && m && verdict && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 text-center font-semibold ${verdictText[verdict]?.cls}`}>
            {verdictText[verdict]?.label}
            {verdict !== 'no_data' && <p className="mt-1 text-sm font-normal">Market average: AED {m.avg.toLocaleString('en-AE')}/mo · {m.samples} report{m.samples === 1 ? '' : 's'}</p>}
          </div>

          {verdict !== 'no_data' && (
            <div className="space-y-3 rounded-xl border bg-white p-5">
              <Bar label="Market min" value={m.min} pct={pct(m.min)} color="bg-navy-300" />
              <Bar label="Market avg" value={m.avg} pct={pct(m.avg)} color="bg-teal-400" />
              <Bar label="Market max" value={m.max} pct={pct(m.max)} color="bg-navy-300" />
              <Bar label="You" value={userSalary} pct={pct(userSalary)} color="bg-orange-400" highlight />
            </div>
          )}

          {q.data.higher.length > 0 && (
            <div className="rounded-xl border bg-white p-5">
              <h2 className="font-display text-sm font-bold text-navy-900">Jobs paying more</h2>
              <div className="mt-3 divide-y">
                {q.data.higher.map((j) => (
                  <Link key={j.slug} href={`/jobs/${j.slug}`} className="flex items-center justify-between gap-3 py-3 hover:text-teal-700">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy-900">{j.title}</span>
                      <span className="block text-xs text-navy-700/50">{j.company?.name ?? 'Confidential'}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-teal-700">{formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden, j.salaryNegotiable)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={shareWhatsApp}>📲 Share result on WhatsApp</Button>
        </div>
      )}
    </div>
  );
}

function Bar({ label, value, pct, color, highlight }: { label: string; value: number; pct: string; color: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`w-24 shrink-0 ${highlight ? 'font-bold text-orange-600' : 'text-navy-700/70'}`}>{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-navy-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: pct }} />
      </div>
      <span className="w-24 shrink-0 text-right font-semibold text-navy-900">AED {value.toLocaleString('en-AE')}</span>
    </div>
  );
}
