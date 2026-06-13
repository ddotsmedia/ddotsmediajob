'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail, Download, GripVertical, Sparkles, EyeOff, Eye } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { downloadCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';

const COLUMNS = ['applied', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'] as const;
type Status = (typeof COLUMNS)[number];

export default function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const apps = trpc.applications.forJob.useQuery({ jobId: id });
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [blind, setBlind] = useState(false);
  // Identity is revealed once a candidate is shortlisted or further.
  const REVEALED: Status[] = ['shortlisted', 'interview', 'offered', 'hired'];

  const updateStatus = trpc.applications.updateStatus.useMutation({
    onMutate: async ({ applicationId, status }) => {
      await utils.applications.forJob.cancel({ jobId: id });
      const prev = utils.applications.forJob.getData({ jobId: id });
      utils.applications.forJob.setData({ jobId: id }, (old) =>
        old?.map((a) => (a.id === applicationId ? { ...a, status } : a)),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) utils.applications.forJob.setData({ jobId: id }, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => utils.applications.forJob.invalidate({ jobId: id }),
  });

  const rank = trpc.ai.rankCandidates.useMutation({
    onSuccess: (r) => {
      utils.applications.forJob.invalidate({ jobId: id });
      toast.success(`Ranked ${r.ranked.length} candidates`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (apps.isLoading) return <Loader2 className="animate-spin text-teal-500" />;
  const byStatus = (s: string) => apps.data?.filter((a) => a.status === s) ?? [];

  function onDrop(status: Status) {
    setOver(null);
    if (dragId) updateStatus.mutate({ applicationId: dragId, status });
    setDragId(null);
  }

  function exportCsv() {
    const rows = (apps.data ?? []).map((a) => ({
      name: a.seeker?.name ?? '',
      email: a.seeker?.email ?? '',
      status: a.status,
      phone: a.phone ?? '',
      applied: new Date(a.createdAt).toISOString(),
      coverLetter: a.coverLetter ?? '',
    }));
    if (!rows.length) return toast.error('No applications to export');
    downloadCsv(`applications-${id.slice(0, 8)}.csv`, rows);
  }

  return (
    <div>
      <Link href="/employer/jobs" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Applications Pipeline</h1>
          <p className="text-navy-700/60">{apps.data?.length ?? 0} candidates · drag cards between stages.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={blind ? 'accent' : 'outline'} size="sm" onClick={() => setBlind((b) => !b)} title="Hide names, emails, photos until shortlist to reduce bias">
            {blind ? <EyeOff /> : <Eye />} Blind review
          </Button>
          <Button variant="outline" size="sm" onClick={() => rank.mutate({ jobId: id })} disabled={rank.isPending}>
            {rank.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} AI Rank
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download /> Export CSV</Button>
        </div>
      </div>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div
            key={col}
            onDragOver={(e) => { e.preventDefault(); setOver(col); }}
            onDragLeave={() => setOver((o) => (o === col ? null : o))}
            onDrop={() => onDrop(col)}
            className="w-72 shrink-0"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="font-display text-sm font-bold capitalize text-navy-900">{col}</h3>
              <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-semibold text-navy-700">{byStatus(col).length}</span>
            </div>
            <div className={cn('min-h-[120px] space-y-2 rounded-xl border-2 border-dashed p-2 transition-colors', over === col ? 'border-teal-400 bg-teal-50/60' : 'border-transparent bg-navy-50/60')}>
              {byStatus(col).map((app) => {
                const hidden = blind && !REVEALED.includes(col);
                return (
                <div
                  key={app.id}
                  draggable
                  onDragStart={() => setDragId(app.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn('cursor-grab rounded-lg border bg-white p-3 shadow-sm active:cursor-grabbing', dragId === app.id && 'opacity-50')}
                >
                  <div className="flex items-start gap-1.5">
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-semibold text-navy-900">{hidden ? `Candidate #${app.id.slice(0, 4).toUpperCase()}` : (app.seeker?.name ?? app.guestName ?? 'Candidate')}</p>
                        {typeof app.matchScore === 'number' && (
                          <Badge variant={app.matchScore >= 70 ? 'success' : app.matchScore >= 40 ? 'gold' : 'muted'}>{app.matchScore}</Badge>
                        )}
                      </div>
                      {hidden ? (
                        <p className="flex items-center gap-1 text-xs text-navy-700/40"><EyeOff className="h-3 w-3" /> Hidden until shortlist</p>
                      ) : (
                        <a href={`mailto:${app.seeker?.email ?? app.guestEmail}`} className="flex items-center gap-1 text-xs text-teal-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                          <Mail className="h-3 w-3" /> <span className="truncate">{app.seeker?.email ?? app.guestEmail}</span>
                        </a>
                      )}
                      <p className="mt-1 text-xs text-navy-700/50">{timeAgo(app.createdAt)}{app.seekerId ? '' : ' · guest'}</p>
                      {app.aiSummary && <p className="mt-1 line-clamp-2 text-xs font-medium text-teal-700">{app.aiSummary}</p>}
                      {app.coverLetter && <p className="mt-1 line-clamp-2 text-xs text-navy-700/70">{app.coverLetter}</p>}
                    </div>
                  </div>
                </div>
                );
              })}
              {byStatus(col).length === 0 && <p className="px-2 py-4 text-center text-xs text-navy-700/40">Drop here</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
