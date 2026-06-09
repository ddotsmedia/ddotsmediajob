'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Award, Clock, ListChecks, Loader2, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Loaded = Awaited<ReturnType<ReturnType<typeof trpc.useUtils>['assessments']['get']['fetch']>>;
type Result = { score: number; passed: boolean; correct: number; total: number; badgeName: string; badgeColor: string };

export default function AssessmentsDashboard() {
  const utils = trpc.useUtils();
  const list = trpc.assessments.list.useQuery();
  const mine = trpc.assessments.myResults.useQuery();
  const submit = trpc.assessments.submit.useMutation();

  const [active, setActive] = useState<Loaded | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [secs, setSecs] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const finish = useCallback(async (final: number[]) => {
    if (!active) return;
    try {
      const r = await submit.mutateAsync({ assessmentId: active.id, answers: final });
      setResult(r);
      setActive(null);
      mine.refetch();
      utils.assessments.leaderboard.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
      setActive(null);
    }
  }, [active, submit, mine, utils]);

  const advance = useCallback((answer: number) => {
    if (!active) return;
    const next = [...answers];
    next[idx] = answer;
    setAnswers(next);
    if (idx + 1 >= active.questions.length) {
      void finish(next);
    } else {
      setIdx(idx + 1);
      setSecs(active.timeLimitSec);
    }
  }, [active, answers, idx, finish]);

  // Per-question countdown — auto-advance (records -1 = unanswered) on timeout.
  useEffect(() => {
    if (!active || secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [active, secs]);
  useEffect(() => {
    if (active && secs === 0) advance(-1);
  }, [active, secs, advance]);

  async function start(slug: string) {
    setLoadingSlug(slug);
    try {
      const a = await utils.assessments.get.fetch({ slug });
      setActive(a);
      setIdx(0);
      setAnswers([]);
      setResult(null);
      setSecs(a.timeLimitSec);
    } catch {
      toast.error('Could not load assessment');
    } finally {
      setLoadingSlug(null);
    }
  }

  // ── Taking a quiz ──
  if (active) {
    const q = active.questions[idx]!;
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-navy-900">{active.title}</h1>
          <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold', secs <= 10 ? 'bg-red-100 text-red-700' : 'bg-navy-100 text-navy-700')}><Clock className="h-4 w-4" /> {secs}s</span>
        </div>
        <div className="mb-2 h-2 w-full rounded-full bg-navy-100"><div className="h-2 rounded-full bg-teal-500 transition-all" style={{ width: `${((idx) / active.questions.length) * 100}%` }} /></div>
        <p className="mb-4 text-sm text-navy-700/60">Question {idx + 1} of {active.questions.length}</p>
        <div className="rounded-xl border bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-navy-900">{q.q}</h2>
          <div className="mt-4 space-y-2">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => advance(i)} disabled={submit.isPending}
                className="block w-full rounded-lg border bg-white px-4 py-3 text-left text-navy-800 transition-colors hover:border-teal-400 hover:bg-teal-50 disabled:opacity-50">
                {opt}
              </button>
            ))}
          </div>
        </div>
        {submit.isPending && <p className="mt-4 flex items-center gap-2 text-navy-700/60"><Loader2 className="h-4 w-4 animate-spin" /> Scoring…</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2"><Award className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Skill Assessments</h1></div>
      <p className="text-navy-700/60">Pass a timed test to earn a verified badge on your profile.</p>

      {result && (
        <div className={cn('mt-6 flex items-center gap-4 rounded-xl border p-5', result.passed ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50')}>
          {result.passed ? <CheckCircle2 className="h-10 w-10 text-green-600" /> : <XCircle className="h-10 w-10 text-orange-500" />}
          <div>
            <p className="font-display text-lg font-bold text-navy-900">{result.score}% — {result.correct}/{result.total} correct</p>
            {result.passed
              ? <p className="text-sm text-green-700">Passed! You earned the <span className="font-semibold" style={{ color: result.badgeColor }}>{result.badgeName}</span> badge.</p>
              : <p className="text-sm text-orange-700">Not passed this time — review and try again.</p>}
          </div>
        </div>
      )}

      {mine.data && mine.data.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-900"><Trophy className="h-5 w-5 text-gold-500" /> Your badges</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {mine.data.filter((r) => r.passed).map((r) => (
              <span key={r.id} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ backgroundColor: r.assessment?.badgeColor ?? '#2a9aa4' }}>
                <Award className="h-3.5 w-3.5" /> {r.assessment?.badgeName} · {r.score}%
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-display text-lg font-bold text-navy-900">Available tests</h2>
        {list.isLoading ? <Loader2 className="mt-4 animate-spin text-teal-500" /> : list.data && list.data.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {list.data.map((a) => (
              <div key={a.id} className="rounded-xl border bg-white p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-navy-900">{a.title}</h3>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: a.badgeColor }}><Award className="h-3 w-3" /> {a.badgeName}</span>
                </div>
                {a.description && <p className="mt-1 line-clamp-2 text-sm text-navy-700/70">{a.description}</p>}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-navy-700/60">
                  <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" /> {a.questionCount} questions</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.timeLimitSec}s each</span>
                  <span>Pass: {a.passScore}%</span>
                </div>
                <Button className="mt-4 w-full" onClick={() => start(a.slug)} disabled={loadingSlug === a.slug}>
                  {loadingSlug === a.slug ? <Loader2 className="animate-spin" /> : null} Start test
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border bg-white p-10 text-center text-navy-700/60">No assessments available yet.</p>
        )}
      </section>
    </div>
  );
}
