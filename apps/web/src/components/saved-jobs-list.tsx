'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readSavedJobs, subscribeSavedJobs } from '@/lib/saved-jobs';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';
import { Heart } from 'lucide-react';

export function SavedJobsList() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSavedJobs = async () => {
      try {
        setLoading(true);
        const ids = readSavedJobs();
        setSavedIds(ids);

        if (ids.length === 0) {
          setJobs([]);
          setLoading(false);
          return;
        }

        // Fetch jobs via tRPC
        const api = await getApi();
        const jobList = await api.jobs.savedBySlugs({ slugs: ids });
        setJobs(jobList);
      } catch (err) {
        setError('Failed to load saved jobs');
      } finally {
        setLoading(false);
      }
    };

    loadSavedJobs();

    // Subscribe to changes
    const unsubscribe = subscribeSavedJobs(() => {
      const newIds = readSavedJobs();
      setSavedIds(newIds);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">{error}</div>;
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg text-slate-600">No saved jobs yet</p>
        <p className="text-sm text-slate-500 mt-2">Browse jobs and save your favorites to see them here</p>
        <Link href="/jobs" className="text-[#2E8E97] hover:underline font-semibold mt-4 inline-block">
          Browse jobs →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
