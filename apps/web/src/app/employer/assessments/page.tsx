'use client';

import Link from 'next/link';
import { ClipboardList, Plus, Loader2, Clock, Target } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

export default function AssessmentsPage() {
  const list = trpc.employerAts.listMyTests.useQuery();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Skills tests</h1></div>
        <Button asChild size="sm"><Link href="/employer/assessments/create"><Plus className="h-4 w-4" /> New test</Link></Button>
      </div>
      <p className="text-navy-700/60">Custom screening tests you can attach to jobs.</p>

      <div className="mt-5 space-y-2">
        {list.isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-500" /></div>
          : !list.data?.length ? <p className="rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No tests yet. Create one — AI can draft the questions.</p>
          : list.data.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div>
                <p className="font-semibold text-navy-900">{t.title}</p>
                <p className="flex items-center gap-3 text-xs text-navy-700/60">
                  <span>{t.questions.length} questions</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(t.timeLimitSec / 60)} min</span>
                  <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> pass {t.passScore}%</span>
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
