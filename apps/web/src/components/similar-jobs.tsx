'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { categoryBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { JobCard } from '@/components/job-card';

/** "Similar jobs": pgvector match, falling back to same category+emirate. */
export function SimilarJobs({ jobId }: { jobId: string }) {
  const q = trpc.jobs.similar.useQuery({ jobId, limit: 4 }, { staleTime: 300_000 });
  if (!q.data?.length) return null;
  const catSlug = q.data[0]?.categorySlug;
  const cat = catSlug ? categoryBySlug(catSlug) : null;
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-navy-900">Similar jobs you might like</h2>
        {cat && (
          <Link href={`/jobs?category=${cat.slug}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-600 hover:underline">
            View all {cat.name} jobs <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {/* 2x2 desktop; horizontal scroll on mobile */}
      <div className="mt-3 flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible">
        {q.data.map((job) => (
          <div key={job.slug} className="w-[85vw] shrink-0 sm:w-auto">
            <JobCard job={job} />
          </div>
        ))}
      </div>
    </div>
  );
}
