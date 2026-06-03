import Link from 'next/link';
import { Briefcase, Users, FileText, Building2, CheckSquare, Clock, TrendingUp } from 'lucide-react';
import { categoryBySlug, timeAgo } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { StatCard } from '@/components/dashboard/stat-card';
import { MiniBar, HBars } from '@/components/admin/mini-bar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const api = await getApi();
  const [stats, ov] = await Promise.all([api.admin.stats(), api.admin.overview()]);

  const series = (ov.jobsSeries ?? []).map((d) => ({ label: d.label, value: Number(d.value) }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Admin Dashboard</h1>
        {stats.pendingJobs > 0 && (
          <Button asChild><Link href="/admin/approvals"><CheckSquare /> {stats.pendingJobs} to review</Link></Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Total Jobs" value={stats.jobs} />
        <StatCard icon={Users} label="Users" value={stats.users} />
        <StatCard icon={FileText} label="Applications" value={stats.applications} />
        <StatCard icon={Building2} label="Companies" value={stats.companies} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-500" />
            <h2 className="font-display text-sm font-bold text-navy-900">Jobs posted — last 14 days</h2>
          </div>
          <MiniBar data={series.length ? series : [{ label: 'n/a', value: 0 }]} />
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-3 font-display text-sm font-bold text-navy-900">Top active categories</h2>
          <HBars data={ov.topCategories.map((c) => ({ label: categoryBySlug(c.slug ?? '')?.name ?? c.slug ?? '—', value: c.count }))} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <BreakdownCard title="Jobs by status" data={ov.jobsByStatus} />
        <BreakdownCard title="Users by role" data={ov.usersByRole} />
        <BreakdownCard title="Applications by stage" data={ov.appsByStatus} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white">
          <h2 className="border-b p-4 font-display text-sm font-bold text-navy-900">Recent jobs</h2>
          <div className="divide-y">
            {ov.recentJobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between p-4">
                <span className="truncate text-sm font-medium text-navy-900">{j.title}</span>
                <span className="flex items-center gap-2 text-xs text-navy-700/50">
                  <Badge variant="muted" className="capitalize">{j.status}</Badge>
                  <Clock className="h-3 w-3" /> {timeAgo(j.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white">
          <h2 className="border-b p-4 font-display text-sm font-bold text-navy-900">Recent signups</h2>
          <div className="divide-y">
            {ov.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-900">{u.name ?? '—'}</p>
                  <p className="truncate text-xs text-navy-700/50">{u.email}</p>
                </div>
                <Badge variant="muted" className="capitalize">{u.role}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-3 font-display text-sm font-bold text-navy-900">{title}</h2>
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-sm">
            <span className="w-24 shrink-0 capitalize text-navy-700/70">{k.replace(/-/g, ' ')}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-navy-100">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${(v / total) * 100}%` }} />
            </div>
            <span className="w-8 text-right font-semibold text-navy-900">{v}</span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-navy-700/50">No data.</p>}
      </div>
    </div>
  );
}
