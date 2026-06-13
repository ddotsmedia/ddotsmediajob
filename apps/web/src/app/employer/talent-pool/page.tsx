'use client';

import { useState } from 'react';
import { Users, Trash2, Loader2, Search, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Badge } from '@/components/ui/primitives';

export default function TalentPoolPage() {
  const utils = trpc.useUtils();
  const list = trpc.employerAts.talentPoolList.useQuery();
  const remove = trpc.employerAts.talentPoolRemove.useMutation({
    onSuccess: () => { utils.employerAts.talentPoolList.invalidate(); toast.success('Removed'); },
    onError: (e) => toast.error(e.message),
  });
  const [q, setQ] = useState('');

  const rows = (list.data ?? []).filter((r) => {
    if (!q.trim()) return true;
    const hay = `${r.name ?? ''} ${r.notes ?? ''} ${(r.tags ?? []).join(' ')}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2"><Users className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Talent Pool</h1></div>
      <p className="text-navy-700/60">Saved candidates you can re-engage for future roles.</p>

      <div className="mt-5 flex items-center gap-2 rounded-xl border bg-white p-2">
        <Search className="ml-1 h-4 w-4 text-navy-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, notes, tags" className="border-0 focus-visible:ring-0" />
      </div>

      <div className="mt-5 space-y-3">
        {list.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-500" /></div>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No saved candidates yet. Add them from applications or candidate search.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div className="min-w-0">
                <p className="font-semibold text-navy-900">{r.name ?? 'Candidate'}</p>
                {r.notes && <p className="text-sm text-navy-700/60">{r.notes}</p>}
                <div className="mt-1 flex flex-wrap gap-1">{(r.tags ?? []).map((t) => <Badge key={t} variant="muted">{t}</Badge>)}</div>
              </div>
              <div className="flex gap-2">
                {r.email && <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"><MessageSquare className="h-4 w-4" /> Contact</a>}
                <Button size="sm" variant="outline" onClick={() => remove.mutate({ id: r.id })} disabled={remove.isPending}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
