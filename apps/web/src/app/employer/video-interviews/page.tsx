'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Video, Loader2, Plus, Trash2, X, Copy, Eye } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Input, Label } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

type Q = { text: string; timeLimitSec: number };
const blankQ = (): Q => ({ text: '', timeLimitSec: 60 });

export default function VideoInterviewsPage() {
  const utils = trpc.useUtils();
  const mine = trpc.videoInterviews.mine.useQuery();
  const inval = () => utils.videoInterviews.mine.invalidate();
  const create = trpc.videoInterviews.create.useMutation({ onSuccess: () => { inval(); toast.success('Interview created'); reset(); } });
  const toggle = trpc.videoInterviews.toggleActive.useMutation({ onSuccess: inval });
  const remove = trpc.videoInterviews.remove.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); } });

  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Q[]>([blankQ()]);
  const [viewing, setViewing] = useState<string | null>(null);

  function reset() { setShow(false); setTitle(''); setQuestions([blankQ()]); }
  function setQ(i: number, patch: Partial<Q>) { setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q))); }

  const valid = title.trim().length >= 2 && questions.every((q) => q.text.trim().length > 0);
  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/interview/${token}`);
    toast.success('Share link copied');
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Video className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Video Interviews</h1></div>
        <Button onClick={() => setShow((s) => !s)}>{show ? <X /> : <Plus />} {show ? 'Cancel' : 'New interview'}</Button>
      </div>

      {show && (
        <div className="mt-6 space-y-3 rounded-xl border bg-white p-5">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sales Executive — Screening" /></div>
          <Label>Questions (with answer time limit)</Label>
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-semibold text-navy-700">Q{i + 1}</span>
              <Input value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} placeholder="Question text" />
              <Input type="number" className="w-24" value={String(q.timeLimitSec)} onChange={(e) => setQ(i, { timeLimitSec: Math.max(10, Math.min(300, Number(e.target.value) || 60)) })} title="Seconds" />
              {questions.length > 1 && <Button variant="ghost" size="icon" onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}><Trash2 className="text-red-500" /></Button>}
            </div>
          ))}
          {questions.length < 10 && <Button variant="outline" onClick={() => setQuestions((qs) => [...qs, blankQ()])}><Plus className="h-4 w-4" /> Add question</Button>}
          <div><Button onClick={() => create.mutate({ title, questions })} disabled={create.isPending || !valid}>{create.isPending ? <Loader2 className="animate-spin" /> : null} Create interview</Button></div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {mine.isLoading ? <Loader2 className="animate-spin text-teal-500" /> : mine.data && mine.data.length > 0 ? (
          mine.data.map((iv) => (
            <div key={iv.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy-900">{iv.title}</p>
                  <p className="text-sm text-navy-700/60">{iv.questions.length} questions · {iv.responses.length} responses</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(iv.shareToken)}><Copy className="h-4 w-4" /> Share link</Button>
                  <Button variant="outline" size="sm" onClick={() => setViewing(viewing === iv.id ? null : iv.id)}><Eye className="h-4 w-4" /> Responses</Button>
                  <label className="flex items-center gap-1 text-sm text-navy-700/70"><input type="checkbox" checked={iv.isActive} onChange={(e) => toggle.mutate({ id: iv.id, isActive: e.target.checked })} /> Active</label>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${iv.title}"?`)) remove.mutate({ id: iv.id }); }}><Trash2 className="text-red-500" /></Button>
                </div>
              </div>
              {viewing === iv.id && <Responses interviewId={iv.id} />}
            </div>
          ))
        ) : (
          <p className="rounded-xl border bg-white p-10 text-center text-navy-700/60">No video interviews yet. Create one and share the link with candidates.</p>
        )}
      </div>
    </div>
  );
}

function Responses({ interviewId }: { interviewId: string }) {
  const q = trpc.videoInterviews.responses.useQuery({ interviewId });
  if (q.isLoading) return <Loader2 className="mt-4 animate-spin text-teal-500" />;
  if (!q.data || q.data.length === 0) return <p className="mt-4 text-sm text-navy-700/50">No responses yet.</p>;
  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      {q.data.map((r) => (
        <div key={r.id} className="rounded-lg border bg-navy-50/40 p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-navy-900">{r.applicantName}{r.applicantEmail ? ` · ${r.applicantEmail}` : ''}</p>
            {r.aiScore != null && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">AI {r.aiScore}/100</span>}
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {r.answers.map((a, i) => (
              <div key={i}>
                <p className="mb-1 text-xs font-medium text-navy-700/70">{i + 1}. {a.questionText}</p>
                <video src={a.videoUrl} controls className="w-full rounded-lg border" preload="metadata" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
