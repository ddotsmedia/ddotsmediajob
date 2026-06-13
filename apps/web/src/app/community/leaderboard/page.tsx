'use client';

import Link from 'next/link';
import { Trophy, Loader2, Users, Briefcase, CheckCircle2, HandHeart } from 'lucide-react';
import { trpc } from '@/trpc/react';

export default function LeaderboardPage() {
  const groups = trpc.communityHub.groupLeaderboard.useQuery();
  const volunteers = trpc.communityHub.volunteerLeaderboard.useQuery({ period: 'month' });

  const Board = ({ title, icon: Icon, rows, unit }: { title: string; icon: typeof Trophy; rows?: { slug: string; name: string; value: number }[]; unit: string }) => (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="flex items-center gap-2 font-display text-sm font-bold text-navy-900"><Icon className="h-4 w-4 text-teal-600" /> {title}</h2>
      <div className="mt-3 space-y-1">
        {rows?.length ? rows.map((r, i) => (
          <Link key={r.slug} href={`/whatsapp-groups/${r.slug}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm odd:bg-navy-50/60 hover:bg-teal-50">
            <span className="truncate font-medium text-navy-900">{i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`} {r.name}</span>
            <span className="shrink-0 text-navy-700/60">{r.value} {unit}</span>
          </Link>
        )) : <p className="text-sm text-navy-700/50">No data yet.</p>}
      </div>
    </div>
  );

  return (
    <div className="bg-navy-50/30">
      <section className="bg-navy-900 py-12 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"><Trophy className="h-4 w-4" /> Community leaderboard</span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Top groups &amp; volunteers</h1>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {groups.isLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-500" /></div> : (
          <div className="grid gap-4 lg:grid-cols-3">
            <Board title="Most jobs shared" icon={Briefcase} unit="jobs" rows={groups.data?.mostJobs.map((g) => ({ slug: g.slug, name: g.name, value: g.jobsShared }))} />
            <Board title="Most hires" icon={CheckCircle2} unit="hires" rows={groups.data?.mostHires.map((g) => ({ slug: g.slug, name: g.name, value: g.hires }))} />
            <Board title="Most members" icon={Users} unit="" rows={groups.data?.mostMembers.map((g) => ({ slug: g.slug, name: g.name, value: g.members }))} />
          </div>
        )}

        <div className="mt-8 rounded-xl border bg-white p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-navy-900"><HandHeart className="h-4 w-4 text-teal-600" /> Top volunteers this month</h2>
          <div className="mt-3 space-y-1">
            {volunteers.data?.length ? volunteers.data.map((v, i) => (
              <div key={v.userId} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm odd:bg-navy-50/60"><span className="font-medium text-navy-900">{i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`} {v.name ?? 'Volunteer'}</span><span className="text-navy-700/60">{v.points} pts</span></div>
            )) : <p className="text-sm text-navy-700/50">No volunteer activity yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
