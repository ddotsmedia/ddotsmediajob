'use client';

import { FileText, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Badge } from '@/components/ui/primitives';

const STATUS_VARIANT: Record<string, 'muted' | 'gold' | 'success' | 'urgent'> = {
  draft: 'muted', sent: 'gold', viewed: 'gold', accepted: 'success', declined: 'urgent',
};

export default function OffersPage() {
  const list = trpc.employerAts.listOffers.useQuery();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Offer Letters</h1></div>
      <p className="text-navy-700/60">Track every offer from draft to accepted.</p>

      <div className="mt-5 space-y-3">
        {list.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-500" /></div>
        ) : !list.data?.length ? (
          <p className="rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No offers yet. Create one from an application in the Offer stage.</p>
        ) : (
          list.data.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div>
                <p className="font-semibold text-navy-900">AED {o.salary?.toLocaleString('en-AE')}/month {o.startDate ? `· starts ${o.startDate}` : ''}</p>
                <p className="text-xs text-navy-700/50">Created {new Date(o.createdAt).toLocaleDateString('en-AE')}{o.respondedAt ? ` · responded ${new Date(o.respondedAt).toLocaleDateString('en-AE')}` : ''}</p>
              </div>
              <Badge variant={STATUS_VARIANT[o.status] ?? 'muted'}>{o.status}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
