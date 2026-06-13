'use client';

import { BarChart3, Eye, FileText, TrendingUp, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { StatCard } from '@/components/dashboard/stat-card';
import { MiniBar, HBars } from '@/components/admin/mini-bar';
import { Badge } from '@/components/ui/primitives';

export default function EmployerAnalyticsPage() {
  const analytics = trpc.employers.analytics.useQuery();
  const series = trpc.employers.analyticsSeries.useQuery();
  const insight = trpc.employerAts.weeklyInsight.useQuery();
  const funnel = trpc.employerAts.funnel.useQuery();

  if (analytics.isLoading || !analytics.data) return <Loader2 className="animate-spin text-teal-500" />;
  const { perJob, totals } = analytics.data;

  return (
    <div>
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-teal-500" />
        <h1 className="font-display text-2xl font-bold text-navy-900">Analytics</h1>
      </div>
      <p className="text-navy-700/60">Performance across all your job postings.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Eye} label="Total Views" value={totals.views} />
        <StatCard icon={FileText} label="Applications" value={totals.applications} />
        <StatCard icon={TrendingUp} label="Avg Conversion" value={`${totals.avgConversion}%`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="mb-3 font-display text-sm font-bold text-navy-900">Hiring funnel</h2>
          {funnel.data ? <HBars data={funnel.data} /> : <Loader2 className="animate-spin text-teal-500" />}
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-teal-50 to-white p-5">
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-navy-900"><TrendingUp className="h-4 w-4 text-teal-600" /> AI weekly insight</h2>
          {insight.isLoading ? <Loader2 className="animate-spin text-teal-500" /> : <p className="whitespace-pre-line text-sm text-navy-700/80">{insight.data?.insight}</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-1 font-display text-sm font-bold text-navy-900">Applications — last 14 days</h2>
          <MiniBar data={(series.data ?? []).map((d) => ({ label: d.label, value: Number(d.value) }))} />
        </div>
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-3 font-display text-sm font-bold text-navy-900">Views by job</h2>
          <HBars data={perJob.slice(0, 8).map((j) => ({ label: j.title, value: j.viewCount }))} />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-navy-50 text-left text-navy-700">
            <tr><th className="px-5 py-3">Job</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Views</th><th className="px-5 py-3 text-right">Applicants</th><th className="px-5 py-3 text-right">Conversion</th></tr>
          </thead>
          <tbody>
            {perJob.map((j) => (
              <tr key={j.id} className="border-b last:border-0">
                <td className="px-5 py-3 font-medium text-navy-900">{j.title}</td>
                <td className="px-5 py-3"><Badge variant="muted" className="capitalize">{j.status}</Badge></td>
                <td className="px-5 py-3 text-right">{j.viewCount}</td>
                <td className="px-5 py-3 text-right">{j.applicationCount}</td>
                <td className="px-5 py-3 text-right font-semibold text-teal-700">{j.conversion}%</td>
              </tr>
            ))}
            {perJob.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-navy-700/60">No jobs posted yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
