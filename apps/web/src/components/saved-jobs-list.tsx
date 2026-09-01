'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Loader2, Search } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { JobCard } from '@/components/job-card';
import { Button } from '@/components/ui/button';
import { readSavedJobs, subscribeSavedJobs } from '@/lib/saved-jobs';

/**
 * Guest "Saved jobs" list. Slugs live in localStorage (no auth) — we read them on
 * mount and re-read on every change (un-saving a card here removes it live). The
 * tRPC query resolves slugs → active jobs; jobs that expired or were removed are
 * silently dropped by the API, so we surface that gap to the user.
 */
export function SavedJobsList() {
  // null = "haven't read localStorage yet" (server + first client render) → avoids
  // a hydration flash of the empty state before the effect runs.
  const [slugs, setSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    const sync = () => setSlugs(readSavedJobs());
    sync();
    return subscribeSavedJobs(sync);
  }, []);

  const hasSlugs = !!slugs && slugs.length > 0;
  const query = trpc.jobs.savedBySlugs.useQuery(
    { slugs: slugs ?? [] },
    { enabled: hasSlugs, staleTime: 30_000 },
  );

  // Still reading storage, or fetching the first result set.
  if (slugs === null || (hasSlugs && query.isLoading)) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm font-medium text-teal-700">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your saved jobs…
      </div>
    );
  }

  if (!hasSlugs) return <EmptyState />;

  if (query.isError) {
    return (
      <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-10 text-center">
        <p className="font-display text-lg font-bold text-red-800">Couldn&apos;t load your saved jobs</p>
        <p className="mt-1 text-sm text-red-700/80">Please try again in a moment.</p>
        <Button variant="outline" className="mt-4" onClick={() => query.refetch()}>Retry</Button>
      </div>
    );
  }

  const jobs = query.data ?? [];
  if (jobs.length === 0) return <EmptyState note="Your saved jobs are no longer available (they may have expired)." />;

  // How many saved slugs no longer resolve to an active job.
  const missing = (slugs?.length ?? 0) - jobs.length;

  return (
    <>
      <p className="mb-5 text-sm text-navy-700/60">
        {jobs.length} saved {jobs.length === 1 ? 'job' : 'jobs'}
        {missing > 0 && <span className="text-navy-700/45"> · {missing} no longer available</span>}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </>
  );
}

function EmptyState({ note }: { note?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E5EEF0] bg-white p-12 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-500">
        <Bookmark className="h-7 w-7" />
      </span>
      <p className="mt-4 font-display text-lg font-bold text-navy-900">No saved jobs yet</p>
      <p className="mt-1 text-sm text-navy-700/60">{note ?? 'Tap the bookmark on any job to save it here for later.'}</p>
      <Button asChild variant="accent" className="mt-5">
        <Link href="/jobs"><Search className="h-4 w-4" /> Browse jobs</Link>
      </Button>
    </div>
  );
}
