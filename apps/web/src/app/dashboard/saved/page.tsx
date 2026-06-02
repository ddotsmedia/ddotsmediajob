import Link from 'next/link';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';

export const dynamic = 'force-dynamic';

export default async function SavedJobsPage() {
  const api = await getApi();
  const saved = await api.jobseekers.savedJobs();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Saved Jobs</h1>
      <p className="text-navy-700/60">Jobs you've bookmarked to apply later.</p>

      {saved.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-white p-12 text-center text-navy-700/60">
          No saved jobs yet.{' '}
          <Link href="/jobs" className="font-semibold text-teal-600 hover:underline">Browse jobs</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {saved.map((s) => (
            <JobCard key={s.jobId} job={s.job} />
          ))}
        </div>
      )}
    </div>
  );
}
