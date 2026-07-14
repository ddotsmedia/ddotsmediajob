'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ExternalLink, FileText } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Badge, Select } from '@/components/ui/primitives';

const FILTERS = [
  { v: '', l: 'All' },
  { v: 'applied', l: 'New' },
  { v: 'reviewing', l: 'Reviewed' },
  { v: 'shortlisted', l: 'Shortlisted' },
  { v: 'rejected', l: 'Rejected' },
] as const;

const STATUSES = ['applied', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'] as const;

const STATUS_VARIANT: Record<string, 'default' | 'muted' | 'success' | 'urgent'> = {
  applied: 'default', quick_apply: 'default', reviewing: 'default',
  shortlisted: 'success', interview: 'success', offered: 'success', hired: 'success',
  rejected: 'muted', withdrawn: 'muted',
};

export default function EmployerApplicationsPage() {
  const [status, setStatus] = useState<string>('');
  const utils = trpc.useUtils();
  const apps = trpc.applications.allApplications.useQuery(status ? { status: status as never } : undefined);
  const update = trpc.applications.updateStatus.useMutation({
    onSuccess: () => utils.applications.allApplications.invalidate(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Applications</h1>
        <p className="text-navy-700/60">Every application across all your jobs.</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setStatus(f.v)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${status === f.v ? 'bg-teal-600 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50'}`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        {apps.isLoading ? (
          <Loader2 className="m-6 animate-spin text-teal-500" />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700">
              <tr>
                <th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Applied</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(apps.data ?? []).map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{a.seeker?.name ?? a.guestName ?? 'Candidate'}{a.guestEmail && <span className="block text-xs font-normal text-navy-700/50">{a.guestEmail}</span>}</td>
                  <td className="px-4 py-3 text-navy-700/70"><Link href={`/employer/jobs/${a.job.id}/applications`} className="hover:text-teal-600">{a.job.title}</Link></td>
                  <td className="px-4 py-3 text-navy-700/60">{timeAgo(a.createdAt)}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[a.status] ?? 'default'} className="capitalize">{a.status.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {a.resumeUrl && (
                        <a href={a.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-50" title="View CV">
                          <FileText className="h-3.5 w-3.5" /> CV
                        </a>
                      )}
                      <Select value={a.status} onChange={(e) => update.mutate({ applicationId: a.id, status: e.target.value as never })} className="h-8 w-32 text-xs">
                        {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                      </Select>
                      <Link href={`/employer/jobs/${a.job.id}/applications`} className="text-navy-400 hover:text-teal-600" title="Open in job pipeline"><ExternalLink className="h-4 w-4" /></Link>
                    </div>
                  </td>
                </tr>
              ))}
              {(apps.data ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-navy-700/60">No applications{status ? ' with this status' : ''} yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
