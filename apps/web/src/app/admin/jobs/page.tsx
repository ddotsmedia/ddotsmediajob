'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Star, Trash2, ExternalLink, Search, Pencil } from 'lucide-react';
import { JOB_STATUS, formatSalary } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Input, Select, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

export default function AdminJobsPage() {
  const utils = trpc.useUtils();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const jobs = trpc.admin.allJobs.useQuery({ q: q || undefined, status: status || undefined, page: 1 });

  const inval = () => utils.admin.allJobs.invalidate();
  const feat = trpc.admin.setJobFeatured.useMutation({ onSuccess: () => { inval(); toast.success('Updated'); } });
  const setStatusM = trpc.admin.setJobStatus.useMutation({ onSuccess: () => { inval(); toast.success('Status changed'); } });
  const del = trpc.admin.deleteJob.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); } });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">All Jobs</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-white px-3">
          <Search className="h-4 w-4 text-navy-700/40" />
          <Input className="border-0 focus-visible:ring-0" placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {JOB_STATUS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </Select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {jobs.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700">
              <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Salary</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {jobs.data?.map((j) => (
                <tr key={j.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">
                    {j.title} {j.isFeatured && <Badge className="ml-1">★</Badge>}
                  </td>
                  <td className="px-4 py-3 text-navy-700/70">{j.company?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-navy-700/70">{formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden)}</td>
                  <td className="px-4 py-3">
                    <Select className="h-8 w-28 text-xs" value={j.status} onChange={(e) => setStatusM.mutate({ id: j.id, status: e.target.value as never })}>
                      {JOB_STATUS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => feat.mutate({ id: j.id, featured: !j.isFeatured })} title="Toggle featured">
                        <Star className={j.isFeatured ? 'fill-gold-500 text-gold-500' : ''} />
                      </Button>
                      <Button asChild variant="ghost" size="icon" title="Edit"><Link href={`/admin/jobs/${j.id}/edit`}><Pencil /></Link></Button>
                      <Button asChild variant="ghost" size="icon" title="Preview"><Link href={`/jobs/${j.slug}`} target="_blank"><ExternalLink /></Link></Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => del.mutate({ id: j.id })}><Trash2 className="text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {jobs.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-navy-700/60">No jobs.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
