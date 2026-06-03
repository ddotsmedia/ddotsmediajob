'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Send, Trash2, ExternalLink } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Select, Badge } from '@/components/ui/primitives';

const SOURCES = ['paste', 'whatsapp', 'csv', 'quick', 'url', 'manual'];

export default function DraftsPage() {
  const utils = trpc.useUtils();
  const [source, setSource] = useState('');
  const drafts = trpc.admin.draftJobs.useQuery(source ? { source } : undefined);
  const inval = () => utils.admin.draftJobs.invalidate();
  const publish = trpc.admin.publishDraft.useMutation({ onSuccess: () => { inval(); toast.success('Published live'); } });
  const del = trpc.admin.deleteJob.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Job Drafts</h1>
        <Button asChild><Link href="/admin/jobs/add">Add Job</Link></Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Select className="w-44" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </Select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        {drafts.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Created</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>
              {drafts.data?.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{d.title}<span className="block text-xs font-normal text-navy-700/50">{d.company?.name ?? 'Confidential'}</span></td>
                  <td className="px-4 py-3"><Badge variant="muted" className="capitalize">{d.source}</Badge></td>
                  <td className="px-4 py-3 text-navy-700/50">{timeAgo(d.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" onClick={() => publish.mutate({ id: d.id })}><Send /> Publish</Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: d.id })}><Trash2 className="text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {drafts.data?.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-navy-700/60">No drafts.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
