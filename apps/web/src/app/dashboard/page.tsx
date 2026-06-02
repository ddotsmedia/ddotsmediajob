import Link from 'next/link';
import { FileText, Bookmark, Bell, Search } from 'lucide-react';
import { auth } from '@ddots/auth';
import { getApi } from '@/trpc/server';
import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function DashboardOverview() {
  const session = await auth();
  const api = await getApi();
  const [applications, saved, alerts] = await Promise.all([
    api.applications.mine(),
    api.jobseekers.savedJobs(),
    api.alerts.list(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Welcome back, {session?.user?.name?.split(' ')[0] ?? 'there'} 👋</h1>
        <p className="text-navy-700/60">Here's your job search at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={FileText} label="Applications" value={applications.length} />
        <StatCard icon={Bookmark} label="Saved Jobs" value={saved.length} />
        <StatCard icon={Bell} label="Active Alerts" value={alerts.filter((a) => a.isActive).length} />
      </div>

      <div className="rounded-xl border bg-gradient-to-br from-teal-500 to-navy-900 p-8 text-white">
        <h2 className="font-display text-xl font-bold">Ready to find your next role?</h2>
        <p className="mt-1 text-white/80">Browse thousands of jobs across the UAE and apply in one click.</p>
        <Button asChild variant="default" className="mt-4 bg-white text-navy-900 hover:bg-white/90">
          <Link href="/jobs"><Search /> Browse Jobs</Link>
        </Button>
      </div>

      {applications.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-bold text-navy-900">Recent applications</h2>
          <div className="divide-y rounded-xl border bg-white">
            {applications.slice(0, 5).map((app) => (
              <div key={app.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-navy-900">{app.job.title}</p>
                  <p className="text-sm text-navy-700/60">{app.job.company?.name}</p>
                </div>
                <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold capitalize text-navy-700">{app.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
