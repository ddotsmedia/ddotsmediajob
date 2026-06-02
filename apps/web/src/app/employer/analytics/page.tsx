import { BarChart3, Eye, FileText, TrendingUp } from 'lucide-react';
import { getApi } from '@/trpc/server';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

export default async function EmployerAnalyticsPage() {
  const api = await getApi();
  const { perJob, totals } = await api.employers.analytics();

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

      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-navy-50 text-left text-navy-700">
            <tr>
              <th className="px-5 py-3 font-semibold">Job</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Views</th>
              <th className="px-5 py-3 text-right font-semibold">Applicants</th>
              <th className="px-5 py-3 text-right font-semibold">Conversion</th>
            </tr>
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
