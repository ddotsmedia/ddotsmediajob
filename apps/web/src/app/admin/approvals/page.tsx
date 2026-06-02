'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Check, X } from 'lucide-react';
import { formatSalary, emirateBySlug, categoryBySlug, timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Badge, Input } from '@/components/ui/primitives';

export default function ApprovalsPage() {
  const utils = trpc.useUtils();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const pending = trpc.admin.pendingJobs.useQuery();

  const approve = trpc.admin.approveJob.useMutation({
    onSuccess: () => {
      utils.admin.pendingJobs.invalidate();
      toast.success('Job approved & published');
    },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.admin.rejectJob.useMutation({
    onSuccess: () => {
      utils.admin.pendingJobs.invalidate();
      setRejecting(null);
      setReason('');
      toast.success('Job rejected');
    },
    onError: (e) => toast.error(e.message),
  });

  if (pending.isLoading) return <Loader2 className="animate-spin text-teal-500" />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Job Approvals</h1>
      <p className="text-navy-700/60">{pending.data?.length ?? 0} jobs awaiting review.</p>

      <div className="mt-6 space-y-4">
        {pending.data?.length === 0 && (
          <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">🎉 No pending jobs. All caught up!</p>
        )}
        {pending.data?.map((job) => (
          <div key={job.id} className="rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-display font-bold text-navy-900">{job.title}</h3>
                <p className="text-sm text-navy-700/60">
                  {job.company?.name ?? job.employer?.name} · {job.employer?.email} · {timeAgo(job.createdAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="muted">{categoryBySlug(job.categorySlug)?.name}</Badge>
                  <Badge variant="outline">{emirateBySlug(job.emirateSlug)?.name}</Badge>
                  <Badge variant="default">{formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden)}</Badge>
                  {job.aiGenerated && <Badge variant="success">AI drafted</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => approve.mutate({ id: job.id })} disabled={approve.isPending}>
                  <Check /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setRejecting(rejecting === job.id ? null : job.id)}>
                  <X /> Reject
                </Button>
              </div>
            </div>

            <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-navy-700/80">{job.description}</p>

            {rejecting === job.id && (
              <div className="mt-3 flex gap-2 border-t pt-3">
                <Input placeholder="Reason for rejection…" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button
                  variant="destructive"
                  onClick={() => reject.mutate({ id: job.id, reason })}
                  disabled={reject.isPending || !reason.trim()}
                >
                  Confirm reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
