'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';

const POLL_MS = 30_000;

/**
 * Pending-approval count for the admin sidebar badge.
 *
 * Polls every 30s and toasts when the queue grows, so an admin sitting on any
 * admin screen finds out a job arrived without opening /admin/approvals.
 * There is no server-side notification to admins on submission — this is the
 * only alert path.
 */
export function useAdminPendingJobs(): number {
  const { data } = trpc.admin.pendingJobsCount.useQuery(undefined, {
    refetchInterval: POLL_MS,
    // Keep the badge live when the admin comes back to the tab.
    refetchOnWindowFocus: true,
  });
  const count = data ?? 0;

  // Undefined until the first response lands, so the initial count is never
  // mistaken for growth from zero (which would toast on every page load).
  const prev = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (data === undefined) return;
    const before = prev.current;
    prev.current = data;
    if (before === undefined || data <= before) return;
    const added = data - before;
    toast.info(`${added} new job${added > 1 ? 's' : ''} pending approval`, {
      description: 'Open Job Approvals to review.',
      duration: 5000,
    });
  }, [data]);

  return count;
}
