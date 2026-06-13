'use client';

import { HandHeart, Loader2, Trophy } from 'lucide-react';
import { trpc } from '@/trpc/react';

export default function VolunteersPage() {
  const board = trpc.communityHub.volunteerLeaderboard.useQuery({ period: 'all' });

  return (
    <div className="bg-navy-50/30">
      <section className="bg-navy-900 py-12 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"><HandHeart className="h-4 w-4" /> Our volunteers</span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Community volunteers</h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">The people keeping 76 WhatsApp groups full of fresh jobs. Thank you.</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-4 py-10">
        {board.isLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-500" /></div>
          : !board.data?.length ? <p className="rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No volunteers yet.</p>
          : (
            <div className="rounded-xl border bg-white p-5">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold text-navy-900"><Trophy className="h-4 w-4 text-yellow-500" /> All-time leaders</h2>
              <div className="mt-3 space-y-1">
                {board.data.map((v, i) => (
                  <div key={v.userId} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm odd:bg-navy-50/60"><span className="font-medium text-navy-900">{i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`} {v.name ?? 'Volunteer'}</span><span className="text-navy-700/60">{v.points} pts · {v.jobsShared} shared</span></div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
