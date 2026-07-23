'use client';

import { ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Interstitial shown before sending a candidate to an external channel (WhatsApp / email /
 * employer website). UAE recruitment-scam safety warning (audit Phase 7/9).
 */
export function ExternalWarning({ channel, onConfirm, onCancel }: { channel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="alertdialog" aria-modal="true" aria-label="Leaving DdotsMediaJobs">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-bold text-navy-900"><ShieldAlert className="h-5 w-5 text-orange-500" /> Leaving DdotsMediaJobs</h2>
          <button onClick={onCancel} aria-label="Cancel"><X className="h-5 w-5 text-navy-400" /></button>
        </div>
        <p className="mt-2 text-sm text-navy-700/80">
          You are contacting the employer through an external channel ({channel}). Never share OTPs or bank details,
          and never make payments for recruitment, interviews, visas, or job offers. Legitimate employers do not
          charge candidates.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" onClick={onConfirm}>I understand — continue</Button>
        </div>
      </div>
    </div>
  );
}
