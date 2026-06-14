'use client';

import { trpc } from '@/trpc/react';
import { JobCard } from '@/components/job-card';

/** "Similar jobs" via pgvector semantic match. Renders nothing when unavailable/empty. */
export function SimilarJobs({ jobId }: { jobId: string }) {
  const q = trpc.jobs.similar.useQuery({ jobId, limit: 4 }, { staleTime: 300_000 });
  if (!q.data?.length) return null;
  return (
    <div>
      <h2 className="font-display text-lg font-bold text-navy-900">Similar jobs you might like</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {q.data.map((job) => <JobCard key={job.slug} job={job} />)}
      </div>
    </div>
  );
}
