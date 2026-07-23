'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, ShieldAlert, ExternalLink } from 'lucide-react';
import { REPORT_REASON_LABELS, REPORT_STATUSES, type ReportReason, type ReportStatus } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

const STATUS_TONE: Record<ReportStatus, string> = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-yellow-100 text-navy-800',
  actioned: 'bg-green-100 text-green-700',
  dismissed: 'bg-navy-100 text-navy-600',
};

export default function AdminReportsPage() {
  const [filter, setFilter] = useState<ReportStatus | 'all'>('open');
  const utils = trpc.useUtils();
  const list = trpc.reports.list.useQuery(filter === 'all' ? {} : { status: filter });
  const update = trpc.reports.updateStatus.useMutation({
    onSuccess: () => { utils.reports.list.invalidate(); toast.success('Report updated'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-navy-900"><ShieldAlert className="h-6 w-6 text-red-500" /> Job Reports</h1>
      <p className="text-sm text-navy-700/60">Candidate-submitted reports. Reporter identity is confidential.</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(['all', ...REPORT_STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s ? 'bg-teal-600 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {list.isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
      ) : !list.data?.length ? (
        <p className="mt-10 text-center text-sm text-navy-700/50">No reports.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {list.data.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-navy-900">{REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_TONE[r.status as ReportStatus] ?? ''}`}>{r.status.replace('_', ' ')}</span>
              </div>
              {r.jobSlug && (
                <Link href={`/jobs/${r.jobSlug}`} target="_blank" className="mt-1 inline-flex items-center gap-1 text-sm text-teal-700 hover:underline">
                  {r.jobTitle ?? r.jobSlug} <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              {r.details && <p className="mt-2 rounded-lg bg-navy-50/50 p-2 text-sm text-navy-700/80">{r.details}</p>}
              <p className="mt-1 text-xs text-navy-700/50">{new Date(r.createdAt).toLocaleString('en-AE')}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {REPORT_STATUSES.filter((s) => s !== r.status).map((s) => (
                  <Button key={s} size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, status: s })}>
                    Mark {s.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
