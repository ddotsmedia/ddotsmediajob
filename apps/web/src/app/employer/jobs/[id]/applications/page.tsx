'use client';

import { use } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { APPLICATION_STATUS, timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Select } from '@/components/ui/primitives';

const COLUMNS = ['applied', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'] as const;

export default function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const apps = trpc.applications.forJob.useQuery({ jobId: id });
  const updateStatus = trpc.applications.updateStatus.useMutation({
    onSuccess: () => {
      utils.applications.forJob.invalidate({ jobId: id });
      toast.success('Status updated');
    },
    onError: (e) => toast.error(e.message),
  });

  if (apps.isLoading) return <Loader2 className="animate-spin text-teal-500" />;

  const byStatus = (status: string) => apps.data?.filter((a) => a.status === status) ?? [];

  return (
    <div>
      <Link href="/employer/jobs" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy-900">Applications Pipeline</h1>
      <p className="text-navy-700/60">{apps.data?.length ?? 0} candidates · drag through the hiring stages.</p>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="font-display text-sm font-bold capitalize text-navy-900">{col}</h3>
              <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-semibold text-navy-700">{byStatus(col).length}</span>
            </div>
            <div className="space-y-2 rounded-xl bg-navy-50/60 p-2">
              {byStatus(col).map((app) => (
                <div key={app.id} className="rounded-lg border bg-white p-3 shadow-sm">
                  <p className="font-semibold text-navy-900">{app.seeker?.name ?? 'Candidate'}</p>
                  <a href={`mailto:${app.seeker?.email}`} className="flex items-center gap-1 text-xs text-teal-600 hover:underline">
                    <Mail className="h-3 w-3" /> {app.seeker?.email}
                  </a>
                  <p className="mt-1 text-xs text-navy-700/50">{timeAgo(app.createdAt)}</p>
                  {app.coverLetter && <p className="mt-2 line-clamp-3 text-xs text-navy-700/70">{app.coverLetter}</p>}
                  <Select
                    className="mt-2 h-8 text-xs"
                    value={app.status}
                    onChange={(e) => updateStatus.mutate({ applicationId: app.id, status: e.target.value as never })}
                  >
                    {APPLICATION_STATUS.map((s) => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </Select>
                </div>
              ))}
              {byStatus(col).length === 0 && <p className="px-2 py-4 text-center text-xs text-navy-700/40">Empty</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
