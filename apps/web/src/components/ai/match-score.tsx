'use client';

import { useSession } from 'next-auth/react';
import { Sparkles, Loader2, Check, AlertTriangle } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const VERDICT_COLOR: Record<string, string> = {
  strong: 'text-lime-600',
  good: 'text-teal-600',
  fair: 'text-gold-600',
  weak: 'text-accent-600',
};

export function MatchScoreCard({ jobId }: { jobId: string }) {
  const { status } = useSession();
  const match = trpc.ai.matchScore.useMutation();

  if (status !== 'authenticated') return null;

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-teal-500" />
        <h3 className="font-display text-sm font-bold text-navy-900">AI Match Score</h3>
      </div>

      {!match.data && (
        <>
          <p className="mt-1 text-xs text-navy-700/60">See how well your profile fits this role.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => match.mutate({ jobId })}
            disabled={match.isPending}
          >
            {match.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Check my match
          </Button>
        </>
      )}

      {match.data && (
        <div className="mt-3">
          <div className="flex items-end gap-2">
            <span className="font-display text-4xl font-extrabold text-navy-900">{match.data.score}</span>
            <span className="pb-1 text-sm text-navy-700/50">/100</span>
            <span className={cn('pb-1 text-sm font-bold capitalize', VERDICT_COLOR[match.data.verdict])}>
              {match.data.verdict} fit
            </span>
          </div>
          <p className="mt-2 text-sm text-navy-700/80">{match.data.summary}</p>

          {match.data.strengths.length > 0 && (
            <ul className="mt-3 space-y-1">
              {match.data.strengths.map((s) => (
                <li key={s} className="flex items-start gap-1.5 text-xs text-navy-700">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-600" /> {s}
                </li>
              ))}
            </ul>
          )}
          {match.data.gaps.length > 0 && (
            <ul className="mt-2 space-y-1">
              {match.data.gaps.map((g) => (
                <li key={g} className="flex items-start gap-1.5 text-xs text-navy-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" /> {g}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
