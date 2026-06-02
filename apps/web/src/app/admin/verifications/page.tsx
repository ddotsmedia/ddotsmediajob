'use client';

import { toast } from 'sonner';
import { Loader2, Check, X, FileText } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

export default function AdminVerificationsPage() {
  const utils = trpc.useUtils();
  const pending = trpc.admin.pendingVerifications.useQuery();
  const review = trpc.admin.reviewVerification.useMutation({
    onSuccess: () => {
      utils.admin.pendingVerifications.invalidate();
      toast.success('Reviewed');
    },
    onError: (e) => toast.error(e.message),
  });

  if (pending.isLoading) return <Loader2 className="animate-spin text-teal-500" />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Employer Verifications</h1>
      <p className="text-navy-700/60">{pending.data?.length ?? 0} companies awaiting verification.</p>

      <div className="mt-6 space-y-4">
        {pending.data?.length === 0 && (
          <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">🎉 No pending verifications.</p>
        )}
        {pending.data?.map((p) => (
          <div key={p.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5">
            <div>
              <h3 className="font-display font-bold text-navy-900">{p.companyName}</h3>
              <p className="text-sm text-navy-700/60">Trade licence: {p.tradeLicenseNo ?? '—'}</p>
              {p.verificationDocUrl && (
                <a href={p.verificationDocUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-teal-600 hover:underline">
                  <FileText className="h-4 w-4" /> View document
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => review.mutate({ userId: p.userId, approve: true })} disabled={review.isPending}>
                <Check /> Verify
              </Button>
              <Button size="sm" variant="destructive" onClick={() => review.mutate({ userId: p.userId, approve: false, note: 'Documents could not be verified.' })} disabled={review.isPending}>
                <X /> Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
