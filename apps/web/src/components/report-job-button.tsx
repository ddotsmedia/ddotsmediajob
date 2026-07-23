'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Flag, X, Loader2, ShieldAlert } from 'lucide-react';
import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

/** "Report job" control + modal. Safe for guests (public mutation, rate-limited server-side). */
export function ReportJobButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const report = trpc.reports.create.useMutation({
    onSuccess: () => { toast.success('Thank you — our team will review this report.'); setOpen(false); setReason(''); setDetails(''); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700/60 hover:text-red-600"
      >
        <Flag className="h-4 w-4" /> Report job
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Report this job">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display font-bold text-navy-900"><ShieldAlert className="h-5 w-5 text-red-500" /> Report this job</h2>
              <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5 text-navy-400" /></button>
            </div>
            <p className="mt-1 text-sm text-navy-700/60">Help keep DdotsMediaJobs safe. Reports are confidential.</p>

            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ${reason === r ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-navy-200 text-navy-700 hover:bg-navy-50'}`}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 text-teal-600" />
                  {REPORT_REASON_LABELS[r]}
                </label>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Add details (optional)"
              className="mt-3 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />

            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!reason || report.isPending}
                onClick={() => reason && report.mutate({ jobId, reason, details: details.trim() || undefined })}
              >
                {report.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />} Submit report
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
