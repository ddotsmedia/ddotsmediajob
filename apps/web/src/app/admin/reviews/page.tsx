'use client';

import { toast } from 'sonner';
import { Loader2, Check, X, Star } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

export default function AdminReviewsPage() {
  const utils = trpc.useUtils();
  const reviews = trpc.admin.pendingReviews.useQuery();
  const moderate = trpc.admin.moderateReview.useMutation({
    onSuccess: () => { utils.admin.pendingReviews.invalidate(); toast.success('Done'); },
  });

  if (reviews.isLoading) return <Loader2 className="animate-spin text-teal-500" />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Review Moderation</h1>
      <p className="text-navy-700/60">{reviews.data?.length ?? 0} reviews awaiting approval.</p>

      <div className="mt-6 space-y-3">
        {reviews.data?.length === 0 && <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">🎉 No pending reviews.</p>}
        {reviews.data?.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-900">{r.company?.name ?? 'Company'}</span>
                  <span className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold-500 text-gold-500" />)}</span>
                </div>
                {r.title && <p className="mt-1 font-medium text-navy-900">{r.title}</p>}
                {r.pros && <p className="text-sm text-navy-700"><b className="text-lime-600">Pros:</b> {r.pros}</p>}
                {r.cons && <p className="text-sm text-navy-700"><b className="text-accent-600">Cons:</b> {r.cons}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => moderate.mutate({ id: r.id, approve: true })}><Check /> Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => moderate.mutate({ id: r.id, approve: false })}><X /> Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
