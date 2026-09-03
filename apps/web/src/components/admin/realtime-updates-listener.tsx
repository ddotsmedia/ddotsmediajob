'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Radio } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { useAdminRealtime } from '@/hooks/useAdminRealtime';

/**
 * Keeps open admin screens current when another admin — or a candidate
 * applying, or an employer posting — changes something.
 *
 * Mounted once in the admin layout. It refreshes the *real* figures rather
 * than counting events: the dashboard's totals come from admin.stats /
 * admin.overview, so a counter that starts at 0 each page load would show
 * "Jobs 0" next to a database holding thousands.
 *
 * The dashboard is a server component, so its numbers only change on
 * router.refresh(); tRPC invalidation alone would not touch them.
 *
 * Renders nothing until an update arrives, and is completely inert when Pusher
 * is unconfigured — the admin screens then keep their normal refetching.
 */
export function RealtimeUpdatesListener() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [seen, setSeen] = useState(0);

  const refresh = useCallback(() => {
    setSeen((n) => n + 1);
    // Server-rendered dashboard figures.
    router.refresh();
    // Client-side admin lists.
    void utils.admin.allJobs.invalidate();
    void utils.admin.stats.invalidate();
  }, [router, utils]);

  const jobsChanged = useAdminRealtime(refresh, 'job-changed');
  const jobsPending = useAdminRealtime(refresh, 'job-pending');
  const applications = useAdminRealtime(refresh, 'application-received');

  if (!jobsChanged.enabled) return null;
  const pending = jobsChanged.pending + jobsPending.pending + applications.pending;
  if (pending === 0) return null;

  return (
    <button
      type="button"
      onClick={() => {
        refresh();
        setSeen(0);
        jobsChanged.reset();
        jobsPending.reset();
        applications.reset();
      }}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-teal-300 bg-white px-3 py-2 text-xs font-medium text-teal-800 shadow-lg hover:bg-teal-50"
      title="Something changed — click to refresh now"
      aria-live="polite"
    >
      <Radio className="h-3.5 w-3.5 animate-pulse text-teal-600" />
      {pending} live update{pending === 1 ? '' : 's'}
      <span className="sr-only">— refreshed {seen} times this session</span>
    </button>
  );
}
