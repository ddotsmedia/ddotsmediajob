'use client';

import { BarChart3, Loader2, CheckCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/trpc/react';

export function SalaryPoll({ category, emirate }: { category?: string; emirate?: string }) {
  const { status } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const q = trpc.communityHub.activePoll.useQuery({ category, emirate });
  const vote = trpc.communityHub.votePoll.useMutation({ onSuccess: () => utils.communityHub.activePoll.invalidate() });

  if (q.isLoading) return null;
  const data = q.data;
  if (!data) return null;
  const showResults = data.voted || vote.isSuccess;

  function cast(option: string) {
    if (status !== 'authenticated') { router.push('/login'); return; }
    vote.mutate({ pollId: data!.poll.id, option });
  }

  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-900"><BarChart3 className="h-5 w-5 text-teal-600" /> Community poll</h2>
      <p className="mt-1 text-navy-800">{data.poll.question}</p>
      <div className="mt-3 space-y-2">
        {data.results.map((r) => {
          const pct = data.total ? Math.round((r.votes / data.total) * 100) : 0;
          return showResults ? (
            <div key={r.option}>
              <div className="flex justify-between text-sm"><span className="text-navy-800">{r.option}</span><span className="font-semibold text-navy-900">{pct}%</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} /></div>
            </div>
          ) : (
            <button key={r.option} onClick={() => cast(r.option)} disabled={vote.isPending} className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-navy-50">
              <span className="text-navy-800">{r.option}</span>{vote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1 text-xs text-navy-700/50">{showResults && <CheckCircle2 className="h-3 w-3 text-green-600" />} Based on {data.total} response{data.total === 1 ? '' : 's'}</p>
    </div>
  );
}
