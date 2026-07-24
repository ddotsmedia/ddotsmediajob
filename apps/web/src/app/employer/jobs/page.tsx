'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, Users, Loader2, ExternalLink, Pencil, RefreshCw, Clock, CalendarClock, Pause, Play, CheckCircle2, Archive } from 'lucide-react';
import { formatSalary, formatShort, timeUntilExpiry } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { SocialShare } from '@/components/ai/social-share';

// Exact lifecycle colors (audit Phase 5B): active=green, paused=amber, filled=blue, archived=gray, draft=slate.
const STATUS_CLS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  filled: 'bg-blue-100 text-blue-700',
  archived: 'bg-navy-100 text-navy-500',
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-slate-100 text-slate-600',
  rejected: 'bg-red-100 text-red-700',
  closed: 'bg-navy-100 text-navy-500',
  expired: 'bg-navy-100 text-navy-500',
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
  const renew = trpc.jobs.renew.useMutation({
    onSuccess: () => {
      utils.jobs.mine.invalidate();
      toast.success('Job renewed for 30 days');
    },
    onError: (e) => toast.error(e.message),
  });
  const setStatus = trpc.jobs.updateJobStatus.useMutation({
    onSuccess: (r) => { utils.jobs.mine.invalidate(); toast.success(`Job ${r.status}`); },
    onError: (e) => toast.error(e.message),
  });
  const [hideArchived, setHideArchived] = useState(true);
  const visible = (jobs.data ?? []).filter((j) => !(hideArchived && j.status === 'archived'));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Manage Jobs</h1>
        <Button asChild><Link href="/employer/post">Post a Job</Link></Button>
      </div>
      <label className="mt-3 inline-flex items-center gap-2 text-sm text-navy-700">
        <input type="checkbox" checked={hideArchived} onChange={(e) => setHideArchived(e.target.checked)} className="h-4 w-4 rounded text-teal-600" />
        Hide archived
      </label>

      {jobs.isLoading && <Loader2 className="mt-6 animate-spin text-teal-500" />}

      <div className="mt-6 space-y-3">
        {!jobs.isLoading && visible.length === 0 && (
          <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">
            No jobs to show. <Link href="/employer/post" className="font-semibold text-teal-600 hover:underline">Post a job</Link>.
          </p>
        )}
        {visible.map((job) => (
          <div key={job.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-navy-900">{job.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${STATUS_CLS[job.status] ?? 'bg-navy-100 text-navy-500'}`}>{job.status}</span>
              </div>
              <p className="text-sm text-navy-700/60">
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden, job.salaryNegotiable)}
              </p>
              {job.status === 'rejected' && job.rejectionReason && (
                <p className="mt-1 text-xs text-red-600">Rejected: {job.rejectionReason}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-700/60">
                <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {job.viewCount} views</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {job.applicationCount} applicants</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatShort(job.publishedAt ?? job.createdAt)}</span>
                {job.expiresAt && (() => {
                  const days = Math.round((new Date(job.expiresAt).getTime() - Date.now()) / 86_400_000);
                  const color = days < 7 ? 'text-red-600' : days <= 14 ? 'text-amber-600' : 'text-green-600';
                  return <span className={`inline-flex items-center gap-1 font-medium ${color}`}><CalendarClock className="h-3.5 w-3.5" /> {timeUntilExpiry(job.expiresAt)}</span>;
                })()}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="outline" size="sm">
                <Link href={`/employer/jobs/${job.id}/applications`}>Applicants</Link>
              </Button>
              <Button asChild variant="ghost" size="icon" title="Edit">
                <Link href={`/employer/jobs/${job.id}/edit`}><Pencil /></Link>
              </Button>
              {job.status === 'active' && <SocialShare jobId={job.id} />}
              {job.status === 'active' && (
                <Button asChild variant="ghost" size="icon" title="View live">
                  <Link href={`/jobs/${job.slug}`} target="_blank"><ExternalLink /></Link>
                </Button>
              )}
              {(job.status === 'closed' || job.status === 'expired') && (
                <Button variant="ghost" size="sm" onClick={() => renew.mutate({ id: job.id })} disabled={renew.isPending} title="Renew">
                  <RefreshCw /> Renew
                </Button>
              )}
              {(job.status === 'active' || job.status === 'pending') && (
                <Button variant="ghost" size="sm" onClick={() => close.mutate({ id: job.id })} disabled={close.isPending}>
                  Close
                </Button>
              )}
              {/* Lifecycle actions (Phase 5B) */}
              {job.status === 'active' && (
                <Button variant="ghost" size="sm" title="Pause" onClick={() => setStatus.mutate({ jobId: job.id, newStatus: 'paused' })} disabled={setStatus.isPending}><Pause /> Pause</Button>
              )}
              {job.status === 'paused' && (
                <Button variant="ghost" size="sm" title="Resume" onClick={() => setStatus.mutate({ jobId: job.id, newStatus: 'active' })} disabled={setStatus.isPending}><Play /> Resume</Button>
              )}
              {(job.status === 'active' || job.status === 'paused') && (
                <Button variant="ghost" size="sm" title="Mark filled" onClick={() => setStatus.mutate({ jobId: job.id, newStatus: 'filled' })} disabled={setStatus.isPending}><CheckCircle2 /> Filled</Button>
              )}
              {job.status !== 'archived' && (
                <Button variant="ghost" size="icon" title="Archive" onClick={() => { if (confirm('Archive this job? It will be hidden from search. This cannot be undone.')) setStatus.mutate({ jobId: job.id, newStatus: 'archived' }); }} disabled={setStatus.isPending}>
                  <Archive className="text-navy-500" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
