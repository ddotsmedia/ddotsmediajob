import type { Metadata } from 'next';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { getApi } from '@/trpc/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Verify Credential — DdotsMediaJobs', robots: { index: false } };

export default async function VerifyCredentialPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const api = await getApi();
  const cred = await api.credentials.verify({ hash });

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      {cred ? (
        <div className="rounded-2xl border bg-white p-8 text-center">
          <ShieldCheck className="mx-auto h-14 w-14 text-green-500" />
          <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Credential verified</h1>
          <p className="mt-1 text-sm text-navy-700/60">
            Verified by DdotsMediaJobs{cred.verifiedAt ? ` on ${new Date(cred.verifiedAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
          </p>
          <dl className="mt-6 space-y-3 text-left">
            <div className="flex justify-between gap-4 border-b pb-2"><dt className="text-navy-700/60">Holder</dt><dd className="font-semibold text-navy-900">{cred.holder}</dd></div>
            <div className="flex justify-between gap-4 border-b pb-2"><dt className="text-navy-700/60">Type</dt><dd className="font-semibold capitalize text-navy-900">{cred.credentialType}</dd></div>
            {cred.title && <div className="flex justify-between gap-4 border-b pb-2"><dt className="text-navy-700/60">Title</dt><dd className="font-semibold text-navy-900">{cred.title}</dd></div>}
            <div className="flex justify-between gap-4 border-b pb-2"><dt className="text-navy-700/60">Issuer</dt><dd className="font-semibold text-navy-900">{cred.issuer}</dd></div>
            {cred.year && <div className="flex justify-between gap-4"><dt className="text-navy-700/60">Year</dt><dd className="font-semibold text-navy-900">{cred.year}</dd></div>}
          </dl>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-8 text-center">
          <ShieldX className="mx-auto h-14 w-14 text-navy-300" />
          <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Not verified</h1>
          <p className="mt-1 text-sm text-navy-700/60">This verification link is invalid or the credential has not been verified.</p>
        </div>
      )}
    </div>
  );
}
