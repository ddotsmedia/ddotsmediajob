'use client';

import { useState } from 'react';
import { ShieldCheck, Clock, X, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/primitives';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ddotsmediajobs.com';

export default function CredentialsPage() {
  const utils = trpc.useUtils();
  const list = trpc.credentials.mine.useQuery();
  const add = trpc.credentials.add.useMutation({
    onSuccess: () => { utils.credentials.mine.invalidate(); toast.success('Submitted for verification'); setForm({ credentialType: 'degree', issuer: '', title: '', year: '', fileUrl: '' }); },
    onError: (e) => toast.error(e.message),
  });
  const [form, setForm] = useState({ credentialType: 'degree', issuer: '', title: '', year: '', fileUrl: '' });

  function submit() {
    if (form.issuer.trim().length < 2) { toast.error('Enter the issuer'); return; }
    add.mutate({
      credentialType: form.credentialType as 'degree' | 'certificate' | 'license',
      issuer: form.issuer.trim(),
      title: form.title.trim() || undefined,
      year: form.year.trim() || undefined,
      fileUrl: form.fileUrl.trim() || undefined,
    });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy-900">Verified credentials</h1>
      <p className="text-navy-700/60">Add your degrees, certificates and licences. Once verified, each gets a public verification link and QR you can add to your CV.</p>

      <div className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="font-display text-lg font-bold text-navy-900">Add a credential</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Type</Label><Select value={form.credentialType} onChange={(e) => setForm({ ...form, credentialType: e.target.value })}><option value="degree">Degree</option><option value="certificate">Certificate</option><option value="license">Licence</option></Select></div>
          <div className="space-y-1.5"><Label>Issuer</Label><Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="e.g. University of Sharjah" /></div>
          <div className="space-y-1.5"><Label>Title (optional)</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. BSc Computer Science" /></div>
          <div className="space-y-1.5"><Label>Year (optional)</Label><Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2024" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Document URL (optional)</Label><Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="Link to your certificate (PDF/image)" /></div>
        </div>
        <Button className="mt-4" onClick={submit} disabled={add.isPending}>{add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for verification'}</Button>
      </div>

      <div className="mt-6 space-y-3">
        {list.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-500" /></div>
        ) : !list.data?.length ? (
          <p className="rounded-xl border border-dashed bg-white py-10 text-center text-navy-700/60">No credentials yet.</p>
        ) : (
          list.data.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div>
                <p className="font-semibold text-navy-900">{c.title || c.credentialType}</p>
                <p className="text-sm text-navy-700/60">{c.issuer}{c.year ? ` · ${c.year}` : ''}</p>
              </div>
              {c.status === 'verified' && c.verificationHash ? (
                <a href={`${SITE}/verify/${c.verificationHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  <ShieldCheck className="h-4 w-4" /> Verified — view link <QrCode className="h-3.5 w-3.5" />
                </a>
              ) : c.status === 'rejected' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"><X className="h-4 w-4" /> Rejected</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"><Clock className="h-4 w-4" /> Pending review</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
