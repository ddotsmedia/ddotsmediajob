'use client';

import { toast } from 'sonner';
import { Loader2, BadgeCheck, Star } from 'lucide-react';
import { emirateBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';

export default function AdminCompaniesPage() {
  const utils = trpc.useUtils();
  const companies = trpc.admin.allCompanies.useQuery();
  const setVerified = trpc.admin.setCompanyVerified.useMutation({
    onSuccess: () => { utils.admin.allCompanies.invalidate(); toast.success('Updated'); },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Companies</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {companies.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700">
              <tr><th className="px-4 py-3">Company</th><th className="px-4 py-3">Industry</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Verified</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {companies.data?.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{c.name}</td>
                  <td className="px-4 py-3 text-navy-700/70">{c.industry ?? emirateBySlug(c.emirateSlug ?? '')?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-navy-700/70"><Star className="mr-1 inline h-3.5 w-3.5 fill-gold-500 text-gold-500" />{c.ratingAvg.toFixed(1)} ({c.ratingCount})</td>
                  <td className="px-4 py-3">{c.isVerified ? <Badge variant="success"><BadgeCheck className="mr-1 h-3 w-3" />Yes</Badge> : <Badge variant="muted">No</Badge>}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setVerified.mutate({ id: c.id, verified: !c.isVerified })}>
                      {c.isVerified ? 'Unverify' : 'Verify'}
                    </Button>
                  </td>
                </tr>
              ))}
              {companies.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-navy-700/60">No companies.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
