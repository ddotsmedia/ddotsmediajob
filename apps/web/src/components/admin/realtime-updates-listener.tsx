'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Radio } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { useAdminRealtime } from '@/hooks/useAdminRealtime';

/**
 * Keeps open admin screens current when another admin — or an employer posting
 * a job — changes something.
 *
 * Mounted once in the admin layout. Renders nothing unless an update has
 * actually arrived; when Pusher is unconfigured it is completely inert and the
 * admin screens keep their existing refetch behaviour.
 */
export function RealtimeUpdatesListener() {
  const utils = trpc.useUtils();

  // Refresh the job feed, its count/facets, and the sidebar badges.
  const refresh = useCallback(() => {
    void utils.admin.allJobsInfinite.invalidate();
    void utils.admin.jobCount.invalidate();
    void utils.admin.jobFacets.invalidate();
    void utils.admin.stats.invalidate();
  }, [utils]);

  const changed = useAdminRealtime(refresh, 'job-changed');
  const [newJobs, setNewJobs] = useState(0);

  const onPending = useCallback(() => {
    setNewJobs((n) => n + 1);
    void utils.admin.stats.invalidate();
    void utils.admin.allJobsInfinite.invalidate();
  }, [utils]);

  const pendingFeed = useAdminRealtime(onPending, 'job-pending');

  // Announce arrivals once, not once per re-render.
  useEffect(() => {
    if (newJobs === 0) return;
    toast.info(`${newJobs} new job${newJobs === 1 ? '' : 's'} awaiting review`, { id: 'admin-new-jobs' });
  }, [newJobs]);

  if (!changed.enabled) return null;
  const total = changed.pending + pendingFeed.pending;
  if (total === 0) return null;

  return (
    <button
      type="button"
      onClick={() => { refresh(); changed.reset(); pendingFeed.reset(); setNewJobs(0); }}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-teal-300 bg-white px-3 py-2 text-xs font-medium text-teal-800 shadow-lg hover:bg-teal-50"
      title="Another admin changed something — click to refresh now"
    >
      <Radio className="h-3.5 w-3.5 animate-pulse text-teal-600" />
      {total} live update{total === 1 ? '' : 's'}
    </button>
  );
}
