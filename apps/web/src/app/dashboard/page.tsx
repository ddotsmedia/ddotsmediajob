import Link from 'next/link';
import { FileText, Bookmark, Bell, Search, Sparkles } from 'lucide-react';
import { auth } from '@ddots/auth';
import { getApi } from '@/trpc/server';
import { StatCard } from '@/components/dashboard/stat-card';
import { JobCard } from '@/components/job-card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function DashboardOverview() {
  const session = await auth();
  const api = await getApi();
  const [applications, saved, alerts, profile, recommended] = await Promise.all([
    api.applications.mine(),
    api.jobseekers.savedJobs(),
    api.alerts.list(),
    api.jobseekers.me(),
    api.jobs.recommended({ limit: 4 }).catch(() => [] as Awaited<ReturnType<typeof api.jobs.recommended>>),
  ]);

  const fields = profile
    ? [profile.headline, profile.bio, profile.phone, profile.emirateSlug, profile.categorySlug, profile.experienceLevel, (profile.skills ?? []).length > 0, profile.resumeUrl]
    : [];
  const completion = fields.length ? Math.round((fields.filter(Boolean).length / fields.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Welcome back, {session?.user?.name?.split(' ')[0] ?? 'there'} 👋</h1>
        <p className="text-navy-700/60">Here's your job search at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-navy-700/60">Profile complete</span>
            <span className="font-display text-lg font-extrabold text-teal-600">{completion}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-100">
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${completion}%` }} />
          </div>
          {completion < 100 && (
            <Link href="/dashboard/profile" className="mt-2 inline-block text-xs font-semibold text-teal-600 hover:underline">Complete profile →</Link>
          )}
        </div>
        <StatCard icon={FileText} label="Applications" value={applications.length} />
        <StatCard icon={Bookmark} label="Saved Jobs" value={saved.length} />
        <StatCard icon={Bell} label="Active Alerts" value={alerts.filter((a) => a.isActive).length} />
      </div>

      {recommended.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-navy-900">
            <Sparkles className="h-5 w-5 text-teal-500" /> Recommended for you
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {recommended.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </div>
      )}

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
