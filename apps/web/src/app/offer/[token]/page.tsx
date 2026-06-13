import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TRPCError } from '@trpc/server';
import { FileText } from 'lucide-react';
import { getApi } from '@/trpc/server';
import { OfferActions } from './offer-actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your Job Offer — DdotsMediaJobs', robots: { index: false } };

export default async function OfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let offer;
  try {
    const api = await getApi();
    offer = await api.employerAts.offerByToken({ token });
  } catch (err) {
    if (err instanceof TRPCError && err.code === 'NOT_FOUND') notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2 text-teal-600"><FileText className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wide">Employment Offer</span></div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-navy-700/70">
          <span>Salary: <strong className="text-navy-900">AED {offer.salary?.toLocaleString('en-AE')}/month</strong></span>
          {offer.startDate && <span>Start: <strong className="text-navy-900">{offer.startDate}</strong></span>}
          <span>Probation: <strong className="text-navy-900">{offer.probationMonths} months</strong></span>
        </div>
        {offer.benefits.length > 0 && <p className="mt-2 text-sm text-navy-700/70">Benefits: {offer.benefits.join(', ')}</p>}
        <div className="mt-6 whitespace-pre-wrap border-t pt-6 text-sm leading-relaxed text-navy-800">{offer.content || 'Please review the offer details above.'}</div>
      </div>
      <div className="mt-6"><OfferActions token={token} status={offer.status} /></div>
    </div>
  );
}
