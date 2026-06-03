'use client';

import { useSession } from 'next-auth/react';
import { Target, Loader2, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';

export function SkillGap({ jobId }: { jobId: string }) {
  const { status } = useSession();
  const gap = trpc.ai.skillGap.useMutation();
  if (status !== 'authenticated') return null;

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-teal-500" />
        <h3 className="font-display text-sm font-bold text-navy-900">Check your fit</h3>
      </div>
      {!gap.data && (
        <>
          <p className="mt-1 text-xs text-navy-700/60">See which skills you match and what to learn.</p>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => gap.mutate({ jobId })} disabled={gap.isPending}>
            {gap.isPending ? <Loader2 className="animate-spin" /> : <Target />} Analyze my fit
          </Button>
        </>
      )}
      {gap.data && (
        <div className="mt-3 space-y-3">
          {gap.data.matched.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-lime-600">You match</p>
              <div className="mt-1 flex flex-wrap gap-1">{gap.data.matched.map((s) => <Badge key={s} variant="success"><Check className="mr-1 h-3 w-3" />{s}</Badge>)}</div>
            </div>
          )}
          {gap.data.missing.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-accent-600">Skills to add</p>
              <ul className="mt-1 space-y-1.5">
                {gap.data.missing.map((m) => (
                  <li key={m.skill} className="text-xs text-navy-700">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <AlertTriangle className="h-3 w-3 text-accent-500" /> {m.skill}
                      <Badge variant={m.importance === 'critical' ? 'urgent' : 'muted'} className="ml-1">{m.importance}</Badge>
                    </span>
                    <span className="block pl-4 text-navy-700/60">{m.resource}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
