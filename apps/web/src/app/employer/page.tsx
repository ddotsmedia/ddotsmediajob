import Link from 'next/link';
import { Briefcase, Eye, FileText, CheckCircle2, PlusCircle } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function EmployerDashboard() {
  const api = await getApi();
  const { totals, recentApps } = await api.employers.dashboard();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Employer Dashboard</h1>
          <p className="text-navy-700/60">Your hiring activity at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/employer/candidates">Search CVs</Link></Button>
          <Button asChild variant="outline"><Link href="/employer/applications">View Applications</Link></Button>
          <Button asChild><Link href="/employer/post"><PlusCircle /> Post a Job</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Active Jobs" value={totals.active} />
        <StatCard icon={CheckCircle2} label="Pending Review" value={totals.pending} />
        <StatCard icon={Eye} label="Total Views" value={totals.views} />
        <StatCard icon={FileText} label="Applications" value={totals.applications} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-navy-900">Recent applications</h2>
        <div className="overflow-hidden rounded-xl border bg-white">
          {recentApps.length === 0 ? (
            <p className="p-8 text-center text-navy-700/60">No applications yet.</p>
          ) : (
            <div className="divide-y">
              {recentApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-navy-900">{app.seeker?.name ?? 'Candidate'}</p>
                    <p className="text-sm text-navy-700/60">applied to {app.job?.title} · {timeAgo(app.createdAt)}</p>
                  </div>
                  <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold capitalize text-navy-700">{app.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
