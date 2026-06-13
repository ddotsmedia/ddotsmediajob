'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/primitives';

export function OfferActions({ token, status }: { token: string; status: string }) {
  const [done, setDone] = useState<'accepted' | 'declined' | null>(['accepted', 'declined'].includes(status) ? (status as 'accepted' | 'declined') : null);
  const [signature, setSignature] = useState('');
  const [agree, setAgree] = useState(false);
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'idle' | 'decline'>('idle');
  const respond = trpc.employerAts.respondOffer.useMutation({
    onSuccess: (_d, v) => { setDone(v.decision); toast.success(`Offer ${v.decision}`); },
    onError: (e) => toast.error(e.message),
  });

  if (done === 'accepted') return <div className="rounded-xl bg-green-50 p-5 text-center text-green-800"><CheckCircle2 className="mx-auto h-8 w-8" /><p className="mt-2 font-semibold">Offer accepted 🎉</p><p className="text-sm">The employer has been notified.</p></div>;
  if (done === 'declined') return <div className="rounded-xl bg-navy-50 p-5 text-center text-navy-700"><XCircle className="mx-auto h-8 w-8" /><p className="mt-2 font-semibold">Offer declined</p></div>;

  if (mode === 'decline') {
    return (
      <div className="rounded-xl border bg-white p-5">
        <Label>Reason (optional)</Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5" placeholder="Let the employer know why" />
        <div className="mt-3 flex gap-2">
          <Button variant="outline" onClick={() => respond.mutate({ token, decision: 'declined', reason: reason || undefined })} disabled={respond.isPending}>{respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm decline'}</Button>
          <Button variant="ghost" onClick={() => setMode('idle')}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-5">
      <Label>Type your full name to accept (e-signature)</Label>
      <Input value={signature} onChange={(e) => setSignature(e.target.value)} className="mt-1.5" placeholder="Your full name" />
      <label className="mt-3 flex items-center gap-2 text-sm text-navy-700">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4 rounded text-teal-600" />
        I accept the terms of this offer.
      </label>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => respond.mutate({ token, decision: 'accepted', signature })} disabled={respond.isPending || !agree || signature.trim().length < 2}>
          {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Accept offer
        </Button>
        <Button variant="outline" onClick={() => setMode('decline')}><XCircle className="h-4 w-4" /> Decline</Button>
      </div>
    </div>
  );
}
