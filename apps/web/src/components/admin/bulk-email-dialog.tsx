'use client';

import { useEffect, useState } from 'react';
import { Mail, X, Loader2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  /** Jobs selected — the employer count is lower, since one employer can own many. */
  count: number;
  busy: boolean;
  onClose: () => void;
  onSend: (subject: string, message: string) => void | Promise<void>;
};

const MIN_SUBJECT = 3;
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 5000;

/**
 * Compose one message to the employers behind the selected jobs.
 *
 * Deliberately gated behind an explicit confirm step: this sends real mail to
 * real employers and cannot be recalled, unlike the other bulk actions which
 * only change rows in our own database.
 */
export function BulkEmailDialog({ open, count, busy, onClose, onSend }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Start clean each time it opens — a stale draft would be easy to send by mistake.
  useEffect(() => {
    if (open) {
      setSubject('');
      setMessage('');
      setConfirming(false);
    }
  }, [open]);

  if (!open) return null;

  const valid = subject.trim().length >= MIN_SUBJECT && message.trim().length >= MIN_MESSAGE;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="bulk-email-title">
      <div className="w-full max-w-lg rounded-xl border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 id="bulk-email-title" className="flex items-center gap-2 font-display font-semibold text-navy-900">
            <Mail className="h-4 w-4 text-teal-600" /> Email employers
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-navy-700/50 hover:text-navy-900">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-navy-700/70">
            Sends one message to the employers behind the <strong>{count}</strong> selected job
            {count === 1 ? '' : 's'}. An employer owning several selected jobs receives it once.
          </p>

          <div>
            <label htmlFor="bulk-email-subject" className="mb-1 block text-xs font-semibold text-navy-800">Subject</label>
            <Input
              id="bulk-email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Action needed on your job listing"
              maxLength={150}
            />
          </div>

          <div>
            <label htmlFor="bulk-email-message" className="mb-1 block text-xs font-semibold text-navy-800">Message</label>
            <textarea
              id="bulk-email-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
              rows={6}
              placeholder="Plain text. Line breaks are preserved."
              className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            />
            <p className="mt-1 text-right text-[11px] text-navy-700/50">{message.length}/{MAX_MESSAGE}</p>
          </div>

          {confirming && (
            <div className="flex gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This sends real email and cannot be undone. Send to the employers of {count} job{count === 1 ? '' : 's'}?</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          {confirming ? (
            <Button onClick={() => onSend(subject.trim(), message.trim())} disabled={busy || !valid}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Yes, send now'}
            </Button>
          ) : (
            <Button onClick={() => setConfirming(true)} disabled={!valid || busy}>Review &amp; send</Button>
          )}
        </div>
      </div>
    </div>
  );
}
