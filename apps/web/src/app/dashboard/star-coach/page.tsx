'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Target, RefreshCw } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Label, Select, Textarea } from '@/components/ui/primitives';

const QUESTION_BANK = [
  'Tell me about a time you handled a difficult customer or colleague.',
  'Describe a situation where you had to meet a tight deadline.',
  'Give an example of a goal you achieved and how.',
  'Tell me about a mistake you made and what you learned.',
  'Describe a time you worked in a diverse, multicultural team.',
  'Tell me about a time you took initiative without being asked.',
];

const PARTS = [
  { key: 'situation', label: 'Situation' },
  { key: 'task', label: 'Task' },
  { key: 'action', label: 'Action' },
  { key: 'result', label: 'Result' },
] as const;

export default function StarCoachPage() {
  const [question, setQuestion] = useState(QUESTION_BANK[0]!);
  const [answer, setAnswer] = useState('');
  const coach = trpc.ai.starInterviewCoach.useMutation({ onError: (e) => toast.error(e.message) });
  const r = coach.data;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2">
        <Target className="h-6 w-6 text-teal-500" />
        <h1 className="font-display text-2xl font-bold text-navy-900">STAR Interview Coach</h1>
      </div>
      <p className="mt-1 text-navy-700/70">Practise behavioural answers using the STAR framework — get scored 0–25 on Situation, Task, Action, Result, with UAE-aware tips.</p>

      <div className="mt-6 space-y-4 rounded-xl border bg-white p-5">
        <div className="space-y-1.5">
          <Label>Behavioural question</Label>
          <Select value={question} onChange={(e) => setQuestion(e.target.value)}>
            {QUESTION_BANK.map((q) => <option key={q} value={q}>{q}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Your answer</Label>
          <Textarea className="min-h-[180px]" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Describe the Situation, the Task, the Action you took, and the Result…" maxLength={4000} />
          <p className="text-xs text-navy-700/50">{answer.length}/4000</p>
        </div>
        <Button onClick={() => coach.mutate({ question, answer })} disabled={coach.isPending || answer.trim().length < 10}>
          {coach.isPending ? <Loader2 className="animate-spin" /> : <Target />} Evaluate my answer
        </Button>
      </div>

      {r && (
        <div className="mt-6 space-y-4 rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-navy-900">Score: {r.total}/100</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.verdict === 'strong' ? 'bg-green-100 text-green-700' : r.verdict === 'good' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {r.verdict.replace('_', ' ')}
            </span>
          </div>
          <div className="space-y-2">
            {PARTS.map((p) => {
              const v = r[p.key];
              return (
                <div key={p.key}>
                  <div className="flex justify-between text-sm"><span className="text-navy-700">{p.label}</span><span className="font-semibold text-navy-900">{v}/25</span></div>
                  <div className="mt-1 h-2 rounded-full bg-navy-100"><div className="h-2 rounded-full bg-teal-500" style={{ width: `${(v / 25) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
          {r.suggestions.length > 0 && (
            <div>
              <h3 className="font-semibold text-navy-900">How to improve</h3>
              <ul className="mt-2 space-y-1 text-sm text-navy-700/80">{r.suggestions.map((s, i) => <li key={i} className="flex gap-2"><span className="text-teal-600">•</span> {s}</li>)}</ul>
            </div>
          )}
          {r.total < 80 && (
            <Button variant="outline" size="sm" onClick={() => coach.reset()}><RefreshCw /> Try again — aim for 80+</Button>
          )}
        </div>
      )}
    </div>
  );
}
