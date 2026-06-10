'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, FileText, ShieldAlert, Search } from 'lucide-react';
import { APPLICATION_STATUS } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Select, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

export default function AdminApplicationsPage() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState('');
  const [fraudOnly, setFraudOnly] = useState(false);
  const apps = trpc.admin.allApplications.useQuery({ status: status || undefined });
  const setStatusM = trpc.admin.setApplicationStatus.useMutation({ onSuccess: () => { utils.admin.allApplications.invalidate(); toast.success('Status updated'); } });

  const rows = (apps.data ?? []).filter((a) => (fraudOnly ? (a.fraudScore ?? 0) > 50 : true));

  return (
    <div>
      <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Applications</h1></div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select className="w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {APPLICATION_STATUS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </Select>
        <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-navy-700">
          <input type="checkbox" checked={fraudOnly} onChange={(e) => setFraudOnly(e.target.checked)} /> <ShieldAlert className="h-4 w-4 text-red-500" /> Fraud risk only (&gt;50)
        </label>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {apps.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700"><tr><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Job</th><th className="px-4 py-3">Match</th><th className="px-4 py-3">Fraud</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">CV</th></tr></thead>
            <tbody>
              {rows.map((a) => {
                const name = a.seeker?.name ?? a.guestName ?? a.guestEmail ?? 'Applicant';
                const email = a.seeker?.email ?? a.guestEmail;
                const fraud = a.fraudScore ?? 0;
                return (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-3"><p className="font-medium text-navy-900">{name}</p>{email && <p className="text-xs text-navy-700/50">{email}</p>}</td>
                    <td className="px-4 py-3 text-navy-700/70">{a.job?.title ?? '—'}</td>
                    <td className="px-4 py-3">{a.matchScore != null ? <Badge>{a.matchScore}%</Badge> : '—'}</td>
                    <td className="px-4 py-3">{fraud > 50 ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{fraud}</span> : fraud > 0 ? <span className="text-navy-700/60">{fraud}</span> : '—'}</td>
                    <td className="px-4 py-3">
                      <Select className="h-8 w-32 text-xs" value={a.status} onChange={(e) => setStatusM.mutate({ id: a.id, status: e.target.value as never })}>
                        {APPLICATION_STATUS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                      </Select>
                    </td>
                    <td className="px-4 py-3">{a.resumeUrl ? <Button asChild variant="ghost" size="sm"><Link href={a.resumeUrl} target="_blank">View</Link></Button> : '—'}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-navy-700/60">No applications.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
