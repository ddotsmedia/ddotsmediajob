'use client';

import { useState } from 'react';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CultureQuestion = { id: string; q: string; options: string[] };

export function CultureAssessment({ userType, questions }: { userType: 'seeker' | 'employer'; questions: CultureQuestion[] }) {
  const existing = trpc.culture.mine.useQuery();
  const utils = trpc.useUtils();
  const save = trpc.culture.saveAssessment.useMutation({
    onSuccess: () => { utils.culture.mine.invalidate(); toast.success('Culture profile saved'); },
    onError: (e) => toast.error(e.message),
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const summary = (save.data ?? existing.data?.aiSummary) as Record<string, unknown> | undefined;
  const answered = Object.keys(answers).length;

  function submit() {
    if (answered < questions.length) { toast.error(`Please answer all ${questions.length} questions (${answered}/${questions.length})`); return; }
    save.mutate({ userType, answers });
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="rounded-xl border bg-teal-50/50 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-900"><Sparkles className="h-5 w-5 text-teal-600" /> Your culture profile</h2>
          <div className="mt-3 space-y-2 text-sm text-navy-700/80">
            {Object.entries(summary).map(([k, v]) => (
              <div key={k}>
                <span className="font-semibold capitalize text-navy-900">{k.replace(/([A-Z])/g, ' $1').trim()}: </span>
                {Array.isArray(v) ? (v as string[]).join(', ') : String(v)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((question, i) => (
          <div key={question.id} className="rounded-xl border bg-white p-4">
            <p className="font-medium text-navy-900">{i + 1}. {question.q}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {question.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt }))}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    answers[question.id] === opt ? 'bg-teal-600 text-white' : 'bg-navy-50 text-navy-700 hover:bg-navy-100',
                  )}
                >
                  {answers[question.id] === opt && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}{opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate my profile</Button>
        <span className="text-sm text-navy-700/60">{answered}/{questions.length} answered</span>
      </div>
    </div>
  );
}
