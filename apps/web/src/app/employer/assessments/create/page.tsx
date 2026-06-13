'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

type Q = { q: string; options: string[]; correct: number };

export default function CreateAssessmentPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);
  const [passScore, setPassScore] = useState(60);
  const [questions, setQuestions] = useState<Q[]>([]);

  const gen = trpc.employerAts.generateTestQuestions.useMutation({
    onSuccess: (qs) => { setQuestions(qs); toast.success(`Generated ${qs.length} questions`); },
    onError: (e) => toast.error(e.message),
  });
  const save = trpc.employerAts.createSkillsTest.useMutation({
    onSuccess: () => { toast.success('Test saved'); router.push('/employer/assessments'); },
    onError: (e) => toast.error(e.message),
  });

  function addQ() { setQuestions((qs) => [...qs, { q: '', options: ['', '', '', ''], correct: 0 }]); }
  function setQ(i: number, patch: Partial<Q>) { setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q))); }

  function submit() {
    if (title.trim().length < 2) return toast.error('Enter a test title');
    if (!questions.length) return toast.error('Add at least one question');
    if (questions.some((q) => !q.q.trim() || q.options.some((o) => !o.trim()))) return toast.error('Fill all questions and options');
    save.mutate({ title, timeLimitSec: timeLimit * 60, passScore, questions });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy-900">Create skills test</h1>

      <div className="mt-5 grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label>Test name</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Accountant screening" /></div>
        <div className="space-y-1.5"><Label>Time limit (min)</Label><Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value) || 15)} /></div>
        <div className="space-y-1.5"><Label>Pass score (%)</Label><Input type="number" value={passScore} onChange={(e) => setPassScore(Number(e.target.value) || 60)} /></div>
      </div>

      <div className="mt-4 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/40 p-4">
        <Label className="flex items-center gap-2 text-teal-700"><Sparkles className="h-4 w-4" /> AI question generator</Label>
        <Textarea className="mt-2" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skills to test (optional), e.g. VAT, Excel, reconciliation" />
        <Button className="mt-2" variant="outline" size="sm" onClick={() => gen.mutate({ jobTitle: title || 'role', skills: skills || undefined })} disabled={gen.isPending || title.trim().length < 2}>
          {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate 10 questions
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between"><Label>Question {i + 1}</Label><button onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} className="text-navy-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
            <Input className="mt-1.5" value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} placeholder="Question text" />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => (
                <button key={oi} type="button" onClick={() => setQ(i, { correct: oi })} className={cn('flex items-center gap-2 rounded-lg border p-1 text-left', q.correct === oi ? 'border-green-400 bg-green-50' : '')}>
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', q.correct === oi ? 'bg-green-500 text-white' : 'bg-navy-100 text-navy-600')}>{String.fromCharCode(65 + oi)}</span>
                  <input value={opt} onChange={(e) => setQ(i, { options: q.options.map((o, j) => (j === oi ? e.target.value : o)) })} className="w-full bg-transparent px-1 text-sm outline-none" placeholder={`Option ${oi + 1}`} />
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-navy-700/50">Tap an option to mark it correct.</p>
          </div>
        ))}
        <Button variant="outline" onClick={addQ}><Plus className="h-4 w-4" /> Add question</Button>
      </div>

      <Button className="mt-6" onClick={submit} disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save test</Button>
    </div>
  );
}
