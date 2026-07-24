'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ExternalLink, X, History } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Label, Select } from '@/components/ui/primitives';

type HistoryEntry = { from?: string; to?: string; at?: string; by?: string; notes?: string };
type Company = {
  id: string; name: string; slug: string; legalName: string | null; registrationNumber: string | null;
  website: string | null; tier: string; createdAt: string | Date;
  status: { history?: HistoryEntry[] } | null;
};

export default function VerificationQueuePage() {
  const utils = trpc.useUtils();
  const queue = trpc.admin.verificationQueue.useQuery();
  const [review, setReview] = useState<Company | null>(null);

  return (
    <div className="max-w-5xl">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-navy-900"><ShieldCheck className="h-6 w-6 text-teal-500" /> Verification Queue</h1>
      <p className="text-sm text-navy-700/60">Companies awaiting Enhanced/Pro review (tier = pending).</p>

      {queue.isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
      ) : !queue.data?.length ? (
        <p className="mt-10 text-center text-sm text-navy-700/50">Nothing pending review.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b text-left text-xs text-navy-700/60">
              <th className="p-3">Company</th><th>Legal name</th><th>Reg. no.</th><th>Website</th><th>Submitted</th><th></th>
            </tr></thead>
            <tbody>
              {queue.data.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-navy-900">{c.name}</td>
                  <td className="text-navy-700/80">{c.legalName ?? '—'}</td>
                  <td className="text-navy-700/80">{c.registrationNumber ?? '—'}</td>
                  <td>{c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-700 hover:underline">link <ExternalLink className="h-3 w-3" /></a> : '—'}</td>
                  <td className="text-navy-700/60">{new Date(c.createdAt).toLocaleDateString('en-AE')}</td>
                  <td className="p-3"><Button size="sm" onClick={() => setReview(c as Company)}>Review</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {review && <ReviewModal company={review} onClose={() => setReview(null)} onDone={() => { setReview(null); utils.admin.verificationQueue.invalidate(); }} />}
    </div>
  );
}

function ReviewModal({ company, onClose, onDone }: { company: Company; onClose: () => void; onDone: () => void }) {
  const [tier, setTier] = useState<'basic' | 'enhanced' | 'pro'>('enhanced');
  const [notes, setNotes] = useState('');
  const update = trpc.admin.updateVerificationTier.useMutation({
    onSuccess: (r) => { toast.success(`Set to ${r.tier}`); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const history = company.status?.history ?? [];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-navy-900">{company.name}</h2>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-navy-400" /></button>
        </div>
        <dl className="mt-3 space-y-1 text-sm">
          <Row k="Legal name" v={company.legalName ?? '—'} />
          <Row k="Registration no." v={company.registrationNumber ?? '—'} />
          <Row k="Website" v={company.website ?? '—'} />
          <Row k="Profile" v={<Link href={`/companies/${company.slug}`} target="_blank" className="text-teal-700 hover:underline">/companies/{company.slug}</Link>} />
        </dl>

        <div className="mt-4 space-y-1.5">
          <Label>Set tier</Label>
          <Select value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}>
            <option value="basic">Basic (reject Enhanced, keep Basic)</option>
            <option value="enhanced">Enhanced Verified</option>
            <option value="pro">Pro Verified</option>
          </Select>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label>Review notes (required)</Label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder="e.g. Trade licence verified 2026-07-24" className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
        </div>

        {history.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-navy-700"><History className="h-3.5 w-3.5" /> History</p>
            <ul className="mt-1 space-y-1 text-xs text-navy-700/70">
              {history.map((h, i) => (
                <li key={i}>{h.at ? new Date(h.at).toLocaleDateString('en-AE') : ''}: {h.from} → {h.to}{h.notes ? ` — ${h.notes}` : ''}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={update.isPending || notes.trim().length < 3} onClick={() => update.mutate({ companyId: company.id, newTier: tier, reviewNotes: notes.trim() })}>
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4"><dt className="shrink-0 text-navy-700/60">{k}</dt><dd className="min-w-0 truncate text-right font-medium text-navy-900">{v}</dd></div>;
}
