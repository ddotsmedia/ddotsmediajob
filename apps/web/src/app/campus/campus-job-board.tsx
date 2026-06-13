'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { JobCard } from '@/components/job-card';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'internship', label: 'Internships', filter: { jobType: 'internship' as const } },
  { key: 'graduate', label: 'Graduate', filter: { q: 'graduate' } },
  { key: 'part-time', label: 'Part-time', filter: { jobType: 'part-time' as const } },
  { key: 'fresher', label: 'Fresh graduates', filter: { isFresher: true } },
] as const;

export function CampusJobBoard() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('internship');
  const active = TABS.find((t) => t.key === tab)!;
  const q = trpc.jobs.list.useQuery({ ...active.filter, perPage: 12, page: 1 });

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Campus job categories">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              tab === t.key ? 'bg-teal-600 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {q.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-teal-500" /></div>
        ) : !q.data?.jobs.length ? (
          <p className="rounded-xl border border-dashed bg-white py-16 text-center text-navy-700/60">
            No {active.label.toLowerCase()} listed right now. Check back soon or set a job alert.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {q.data.jobs.map((job) => (
              <JobCard key={job.slug} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
