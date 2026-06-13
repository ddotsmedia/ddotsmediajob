'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail, Download, GripVertical, Sparkles, EyeOff, Eye, LayoutGrid, List } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { downloadCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';

const REVEALED = ['shortlisted', 'interview', 'offer', 'hired'];

type BoardApp = { id: string; name: string; email: string | null; matchScore: number | null; status: string; source: string; createdAt: Date | string; stageId: string };

export default function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const board = trpc.employerAts.board.useQuery({ jobId: id });
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [blind, setBlind] = useState(false);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const move = trpc.employerAts.moveApplication.useMutation({
    onMutate: async ({ applicationId, stageId }) => {
      await utils.employerAts.board.cancel({ jobId: id });
      const prev = utils.employerAts.board.getData({ jobId: id });
      utils.employerAts.board.setData({ jobId: id }, (old) => old ? { ...old, applications: old.applications.map((a) => (a.id === applicationId ? { ...a, stageId } : a)) } : old);
      return { prev };
    },
    onError: (e, _v, ctx) => { if (ctx?.prev) utils.employerAts.board.setData({ jobId: id }, ctx.prev); toast.error(e.message); },
    onSettled: () => utils.employerAts.board.invalidate({ jobId: id }),
  });

  const rank = trpc.ai.rankCandidates.useMutation({
    onSuccess: (r) => { utils.employerAts.board.invalidate({ jobId: id }); toast.success(`Ranked ${r.ranked.length} candidates`); },
    onError: (e) => toast.error(e.message),
  });

  if (board.isLoading) return <Loader2 className="animate-spin text-teal-500" />;
  const stages = board.data?.stages ?? [];
  const apps = board.data?.applications ?? [];
  const columns = [...stages, ...(apps.some((a) => a.stageId === 'rejected') ? [{ id: 'rejected', name: 'Rejected', order: 99 }] : [])];
  const inStage = (sid: string) => apps.filter((a) => a.stageId === sid);

  function onDrop(stageId: string) {
    setOver(null);
    if (dragId) move.mutate({ applicationId: dragId, stageId });
    setDragId(null);
  }

  function exportCsv() {
    const rows = apps.map((a) => ({ name: a.name, email: a.email ?? '', stage: a.stageId, score: a.matchScore ?? '', applied: new Date(a.createdAt).toISOString() }));
    if (!rows.length) return toast.error('No applications to export');
    downloadCsv(`applications-${id.slice(0, 8)}.csv`, rows);
  }

  return (
    <div>
      <Link href="/employer/jobs" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to jobs</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Applications Pipeline</h1>
          <p className="text-navy-700/60">{apps.length} candidates · drag cards between stages.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setView((v) => (v === 'kanban' ? 'list' : 'kanban'))}>{view === 'kanban' ? <List /> : <LayoutGrid />} {view === 'kanban' ? 'List' : 'Board'}</Button>
          <Button variant={blind ? 'accent' : 'outline'} size="sm" onClick={() => setBlind((b) => !b)} title="Hide names until shortlist">{blind ? <EyeOff /> : <Eye />} Blind</Button>
          <Button variant="outline" size="sm" onClick={() => rank.mutate({ jobId: id })} disabled={rank.isPending}>{rank.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} AI Rank</Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download /> CSV</Button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.id} onDragOver={(e) => { e.preventDefault(); setOver(col.id); }} onDragLeave={() => setOver((o) => (o === col.id ? null : o))} onDrop={() => onDrop(col.id)} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="font-display text-sm font-bold text-navy-900">{col.name}</h3>
                <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-semibold text-navy-700">{inStage(col.id).length}</span>
              </div>
              <div className={cn('min-h-[120px] space-y-2 rounded-xl border-2 border-dashed p-2 transition-colors', over === col.id ? 'border-teal-400 bg-teal-50/60' : 'border-transparent bg-navy-50/60')}>
                {inStage(col.id).map((app) => {
                  const hidden = blind && !REVEALED.includes(col.id);
                  return (
                    <div key={app.id} draggable onDragStart={() => setDragId(app.id)} onDragEnd={() => setDragId(null)} className={cn('cursor-grab rounded-lg border bg-white p-3 shadow-sm active:cursor-grabbing', dragId === app.id && 'opacity-50')}>
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-semibold text-navy-900">{hidden ? `Candidate #${app.id.slice(0, 4).toUpperCase()}` : app.name}</p>
                            {typeof app.matchScore === 'number' && <Badge variant={app.matchScore >= 70 ? 'success' : app.matchScore >= 40 ? 'gold' : 'muted'}>{app.matchScore}</Badge>}
                          </div>
                          {hidden ? <p className="flex items-center gap-1 text-xs text-navy-700/40"><EyeOff className="h-3 w-3" /> Hidden until shortlist</p> : app.email && <a href={`mailto:${app.email}`} className="flex items-center gap-1 text-xs text-teal-600 hover:underline" onClick={(e) => e.stopPropagation()}><Mail className="h-3 w-3" /> <span className="truncate">{app.email}</span></a>}
                          <p className="mt-1 text-xs text-navy-700/50">{timeAgo(app.createdAt)}{app.source === 'guest' ? ' · guest' : ''}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {inStage(col.id).length === 0 && <p className="px-2 py-4 text-center text-xs text-navy-700/40">Drop here</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50/60 text-left text-xs font-semibold text-navy-700">
              <tr><th className="px-4 py-2">Candidate</th><th className="px-4 py-2">Stage</th><th className="px-4 py-2">Score</th><th className="px-4 py-2">Applied</th><th className="px-4 py-2">Move</th></tr>
            </thead>
            <tbody>
              {apps.map((app: BoardApp) => (
                <tr key={app.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium text-navy-900">{blind && !REVEALED.includes(app.stageId) ? `Candidate #${app.id.slice(0, 4).toUpperCase()}` : app.name}</td>
                  <td className="px-4 py-2 capitalize">{columns.find((c) => c.id === app.stageId)?.name ?? app.stageId}</td>
                  <td className="px-4 py-2">{app.matchScore ?? '—'}</td>
                  <td className="px-4 py-2 text-navy-700/60">{timeAgo(app.createdAt)}</td>
                  <td className="px-4 py-2">
                    <select value={app.stageId} onChange={(e) => move.mutate({ applicationId: app.id, stageId: e.target.value })} className="rounded-lg border px-2 py-1 text-xs">
                      {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {apps.length === 0 && <p className="py-10 text-center text-navy-700/50">No applications yet.</p>}
        </div>
      )}
    </div>
  );
}
