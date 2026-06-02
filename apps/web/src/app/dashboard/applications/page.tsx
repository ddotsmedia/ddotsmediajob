import Link from 'next/link';
import { timeAgo } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<string, 'muted' | 'success' | 'urgent' | 'default'> = {
  applied: 'muted',
  reviewing: 'default',
  shortlisted: 'default',
  interview: 'default',
  offered: 'success',
  hired: 'success',
  rejected: 'urgent',
  withdrawn: 'muted',
};

export default async function ApplicationsPage() {
  const api = await getApi();
  const applications = await api.applications.mine();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">My Applications</h1>
      <p className="text-navy-700/60">Track the status of every job you've applied to.</p>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        {applications.length === 0 ? (
          <div className="p-12 text-center text-navy-700/60">
            You haven't applied to any jobs yet.{' '}
            <Link href="/jobs" className="font-semibold text-teal-600 hover:underline">Browse jobs</Link>
          </div>
        ) : (
          <div className="divide-y">
            {applications.map((app) => (
              <div key={app.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/jobs/${app.job.slug}`} className="font-semibold text-navy-900 hover:text-teal-600">
                    {app.job.title}
                  </Link>
                  <p className="text-sm text-navy-700/60">
                    {app.job.company?.name} · applied {timeAgo(app.createdAt)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[app.status] ?? 'muted'} className="capitalize">{app.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
