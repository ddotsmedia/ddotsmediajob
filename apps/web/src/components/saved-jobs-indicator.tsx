'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { savedJobsCount, subscribeSavedJobs } from '@/lib/saved-jobs';

/**
 * Header "Saved (N)" indicator. Reads the guest bookmark count from localStorage
 * and updates live (same tab + cross-tab) via the shared subscribe helper.
 * Renders nothing until at least one job is saved, so it never clutters a fresh
 * visit. Count starts at 0 on the server/first render to avoid hydration drift.
 */
export function SavedJobsIndicator({ className }: { className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(savedJobsCount());
    sync();
    return subscribeSavedJobs(sync);
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/saved"
      aria-label={`${count} saved ${count === 1 ? 'job' : 'jobs'}`}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-700 transition-colors hover:border-teal-300 hover:text-teal-600',
        className,
      )}
    >
      <Bookmark className="h-5 w-5" />
      <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#F9733A] px-1 text-[10px] font-bold leading-4 text-white">
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  );
}
