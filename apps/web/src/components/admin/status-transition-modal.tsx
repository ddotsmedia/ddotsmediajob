'use client';

import { useEffect, useState } from 'react';
import { X, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import type { JobStatus } from '@ddots/shared';
import {
  getAvailableTransitions,
  canTransition,
  isDestructive,
  requiresReason,
  transitionHint,
} from '@/lib/job-status-machine';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  jobId: string;
  jobTitle: string;
  currentStatus: JobStatus;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (next: JobStatus, reason?: string) => void;
};

const MAX_REASON = 500;

/**
 * Change one job's status.
 *
 * Only transitions the state machine permits are offered, so an invalid move
 * cannot be attempted — the server enforces the same rules and would reject it
 * anyway. This is also where a rejection reason is captured, which is why it
 * replaced the browser `prompt()` the status dropdown used to fire.
 */
export function StatusTransitionModal({
  open,
  jobId,
  jobTitle,
  currentStatus,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<JobStatus | null>(null);
  const [reason, setReason] = useState('');

  // Fresh each time it opens — a leftover choice from the previous job would be
  // dangerously easy to apply by mistake.
  useEffect(() => {
    if (open) {
      setSelected(null);
      setReason('');
    }
  }, [open, jobId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const options = getAvailableTransitions(currentStatus);
  const needsReason = selected ? requiresReason(selected) : false;
  const reasonOk = !needsReason || reason.trim().length >= 3;
  // Belt-and-braces: `options` already excludes invalid targets.
  const valid = !!selected && canTransition(currentStatus, selected) && reasonOk;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-3">
          <div className="min-w-0">
            <h2 id="status-modal-title" className="font-display font-semibold text-navy-900">Change status</h2>
            <p className="truncate text-xs text-navy-700/60" title={jobTitle}>{jobTitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-0.5 text-navy-700/50 hover:text-navy-900">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-navy-700/60">Current:</span>
            <StatusBadge status={currentStatus} />
          </div>

          {options.length === 0 ? (
            <p className="rounded-lg border border-navy-200 bg-navy-50 px-3 py-3 text-sm text-navy-700">
              <StatusBadge status={currentStatus} /> is terminal — this job cannot change status again.
            </p>
          ) : (
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700">Move to</legend>
              <div className="space-y-1">
                {options.map((s) => (
                  <label
                    key={s}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selected === s ? 'border-teal-400 bg-teal-50' : 'border-transparent hover:bg-navy-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="next-status"
                      className="mt-1"
                      checked={selected === s}
                      onChange={() => setSelected(s)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <ArrowRight className="h-3 w-3 shrink-0 text-navy-700/40" />
                        <StatusBadge status={s} />
                      </span>
                      {transitionHint(s) && (
                        <span className="mt-0.5 block text-xs text-navy-700/60">{transitionHint(s)}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {selected && (
            <div>
              <label htmlFor="status-reason" className="mb-1 block text-xs font-semibold text-navy-800">
                Reason {needsReason ? <span className="text-red-600">(required)</span> : <span className="font-normal text-navy-700/50">(optional)</span>}
              </label>
              <textarea
                id="status-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
                placeholder={needsReason ? 'Shown to the employer…' : 'Recorded in the audit log'}
                className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              />
              <p className="mt-1 text-right text-[11px] text-navy-700/50">{reason.length}/{MAX_REASON}</p>
            </div>
          )}

          {selected && isDestructive(selected) && (
            <div className="flex gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {selected === 'archived'
                  ? 'Archiving is permanent — an archived job can never change status again.'
                  : 'The employer will be told this listing was rejected.'}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={() => selected && onConfirm(selected, reason.trim() || undefined)}
            disabled={!valid || busy}
            title={needsReason && !reasonOk ? 'A reason is required to reject' : undefined}
          >
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Change status'}
          </Button>
        </div>
      </div>
    </div>
  );
}
