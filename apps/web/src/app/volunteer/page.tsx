'use client';

import { useState } from 'react';
import { HandHeart, Loader2, Copy, Send, Trophy } from 'lucide-react';
import { CATEGORIES } from '@ddots/shared';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/primitives';

export default function VolunteerPage() {
  const stats = trpc.communityHub.myVolunteerStats.useQuery();
  const groups = trpc.communityHub.myGroups.useQuery();
  const board = trpc.communityHub.volunteerLeaderboard.useQuery({ period: 'month' });
  const [cat, setCat] = useState<string>(CATEGORIES[0]!.slug);
  const [jobId, setJobId] = useState('');
  const [groupId, setGroupId] = useState('');
  const jobsQ = trpc.jobs.list.useQuery({ category: cat as never, perPage: 20, page: 1 });
  const msg = trpc.communityHub.generateBlastMessage.useQuery({ jobId, groupId }, { enabled: !!jobId && !!groupId });
  const logBlast = trpc.communityHub.logBlast.useMutation({
    onSuccess: () => { stats.refetch(); toast.success('Blast logged · +10 points'); },
    onError: (e) => toast.error(e.message),
  });

  function copyAndLog() {
    if (!msg.data) return;
    navigator.clipboard.writeText(msg.data.message).then(() => {
      logBlast.mutate({ groupId, jobId, message: msg.data!.message });
    }).catch(() => toast.error('Copy failed'));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2"><HandHeart className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Volunteer dashboard</h1></div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Total points" value={stats.data?.totalPoints ?? 0} />
        <Stat label="This month" value={stats.data?.monthPoints ?? 0} />
        <Stat label="Jobs shared" value={stats.data?.jobsShared ?? 0} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-display text-lg font-bold text-navy-900">Quick blast</h2>
          <div className="mt-3 space-y-2">
            <Select value={cat} onChange={(e) => { setCat(e.target.value); setJobId(''); }}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select>
            <Select value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">Select a job…</option>{jobsQ.data?.jobs.map((j) => <option key={j.slug} value={j.id ?? ''}>{j.title}</option>)}</Select>
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="">Select your group…</option>{groups.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select>
          </div>
          {msg.data && (
            <>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-navy-50 p-3 text-sm text-navy-800">{msg.data.message}</pre>
              <Button className="mt-2" size="sm" onClick={copyAndLog} disabled={logBlast.isPending}>{logBlast.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Copy & log blast</Button>
            </>
          )}
          {!groups.data?.length && <p className="mt-3 text-xs text-navy-700/50">No groups assigned yet. Ask an admin to assign you.</p>}
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-900"><Trophy className="h-5 w-5 text-yellow-500" /> Top volunteers</h2>
          <div className="mt-3 space-y-1">
            {board.data?.length ? board.data.map((v, i) => (
              <div key={v.userId} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm odd:bg-navy-50/60"><span className="font-medium text-navy-900">#{i + 1} {v.name ?? 'Volunteer'}</span><span className="text-navy-700/60">{v.points} pts</span></div>
            )) : <p className="text-sm text-navy-700/50">No activity yet this month.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-display text-lg font-bold text-navy-900">My groups</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {groups.data?.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-xl border bg-white p-3"><span className="font-medium text-navy-900">{g.name}</span><span className="text-xs text-navy-700/60">{g.jobsSharedCount} shared</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-white p-4 text-center"><p className="font-display text-2xl font-bold text-navy-900">{value}</p><p className="text-xs text-navy-700/60">{label}</p></div>;
}
