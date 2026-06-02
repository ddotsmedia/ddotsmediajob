'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, Users, Loader2, ExternalLink } from 'lucide-react';
import { formatSalary } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';

const STATUS: Record<string, 'success' | 'default' | 'urgent' | 'muted'> = {
  active: 'success',
  pending: 'default',
  rejected: 'urgent',
  closed: 'muted',
  draft: 'muted',
  expired: 'muted',
  filled: 'muted',
};

export default function ManageJobsPage() {
  const utils = trpc.useUtils();
  const jobs = trpc.jobs.mine.useQuery();
  const close = trpc.jobs.close.useMutation({
    onSuccess: () => {
      utils.jobs.mine.invalidate();
      toast.success('Job closed');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Manage Jobs</h1>
        <Button asChild><Link href="/employer/post">Post a Job</Link></Button>
      </div>

      {jobs.isLoading && <Loader2 className="mt-6 animate-spin text-teal-500" />}

      <div className="mt-6 space-y-3">
        {jobs.data?.length === 0 && (
          <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">
            No jobs yet. <Link href="/employer/post" className="font-semibold text-teal-600 hover:underline">Post your first job</Link>.
          </p>
        )}
        {jobs.data?.map((job) => (
          <div key={job.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-navy-900">{job.title}</h3>
                <Badge variant={STATUS[job.status] ?? 'muted'} className="capitalize">{job.status}</Badge>
              </div>
              <p className="text-sm text-navy-700/60">
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden)}
              </p>
              {job.status === 'rejected' && job.rejectionReason && (
                <p className="mt-1 text-xs text-red-600">Rejected: {job.rejectionReason}</p>
              )}
              <div className="mt-2 flex gap-4 text-xs text-navy-700/60">
                <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {job.viewCount} views</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {job.applicationCount} applicants</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/employer/jobs/${job.id}/applications`}>View Applicants</Link>
              </Button>
              {job.status === 'active' && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/jobs/${job.slug}`} target="_blank"><ExternalLink /></Link>
                </Button>
              )}
              {(job.status === 'active' || job.status === 'pending') && (
                <Button variant="ghost" size="sm" onClick={() => close.mutate({ id: job.id })} disabled={close.isPending}>
                  Close
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
