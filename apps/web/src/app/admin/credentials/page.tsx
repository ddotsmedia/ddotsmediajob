'use client';

import { ShieldCheck, X, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

export default function AdminCredentialsPage() {
  const utils = trpc.useUtils();
  const pending = trpc.credentials.pending.useQuery();
  const approve = trpc.credentials.approve.useMutation({
    onSuccess: () => { utils.credentials.pending.invalidate(); toast.success('Verified — hash generated, applicant notified'); },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.credentials.reject.useMutation({
    onSuccess: () => { utils.credentials.pending.invalidate(); toast.success('Rejected'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy-900">Credential verification</h1>
      <p className="text-navy-700/60">Review submitted credentials. Approving generates a tamper-evident verification hash.</p>

      <div className="mt-6 space-y-3">
        {pending.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-500" /></div>
        ) : !pending.data?.length ? (
          <p className="rounded-xl border border-dashed bg-white py-10 text-center text-navy-700/60">No credentials awaiting review.</p>
        ) : (
          pending.data.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div className="min-w-0">
                <p className="font-semibold text-navy-900">{c.title || c.credentialType}</p>
                <p className="text-sm text-navy-700/60 capitalize">{c.credentialType} · {c.issuer}{c.year ? ` · ${c.year}` : ''}</p>
                {c.fileUrl && <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline"><FileText className="h-3.5 w-3.5" /> View document</a>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve.mutate({ id: c.id })} disabled={approve.isPending}><ShieldCheck className="h-4 w-4" /> Verify</Button>
                <Button size="sm" variant="outline" onClick={() => reject.mutate({ id: c.id })} disabled={reject.isPending}><X className="h-4 w-4" /> Reject</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
