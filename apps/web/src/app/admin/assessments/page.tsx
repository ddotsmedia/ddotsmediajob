'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Award, Loader2, Plus, Trash2, X } from 'lucide-react';
import { CATEGORIES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Input, Label, Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

type Q = { q: string; options: [string, string, string, string]; correct: number };
const blankQ = (): Q => ({ q: '', options: ['', '', '', ''], correct: 0 });

export default function AdminAssessmentsPage() {
  const utils = trpc.useUtils();
  const list = trpc.assessments.adminList.useQuery();
  const inval = () => utils.assessments.adminList.invalidate();
  const create = trpc.assessments.create.useMutation({ onSuccess: () => { inval(); toast.success('Assessment created'); resetForm(); } });
  const remove = trpc.assessments.remove.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); } });
  const toggle = trpc.assessments.toggleActive.useMutation({ onSuccess: () => { inval(); } });

  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [categorySlug, setCategorySlug] = useState<string>(CATEGORIES[0]!.slug);
  const [description, setDescription] = useState('');
  const [badgeName, setBadgeName] = useState('');
  const [badgeColor, setBadgeColor] = useState('#2a9aa4');
  const [timeLimitSec, setTimeLimitSec] = useState('60');
  const [passScore, setPassScore] = useState('70');
  const [questions, setQuestions] = useState<Q[]>([blankQ()]);

  function resetForm() {
    setShow(false); setTitle(''); setDescription(''); setBadgeName(''); setBadgeColor('#2a9aa4');
    setTimeLimitSec('60'); setPassScore('70'); setQuestions([blankQ()]);
  }

  function setQ(i: number, patch: Partial<Q>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function setOpt(i: number, oi: number, val: string) {
    setQuestions((qs) => qs.map((q, idx) => {
      if (idx !== i) return q;
      const options = [...q.options] as Q['options'];
      options[oi] = val;
      return { ...q, options };
    }));
  }

  const valid = title.trim().length >= 2 && badgeName.trim().length >= 1 &&
    questions.every((q) => q.q.trim().length >= 2 && q.options.every((o) => o.trim().length >= 1));

  function submit() {
    if (!valid) { toast.error('Fill all questions, options and the badge name'); return; }
    create.mutate({
      title, categorySlug, description: description || undefined, badgeName, badgeColor,
      timeLimitSec: Number(timeLimitSec) || 60, passScore: Number(passScore) || 70,
      questions: questions.map((q) => ({ q: q.q, options: q.options, correct: q.correct })),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Award className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Assessments</h1></div>
        <Button onClick={() => setShow((s) => !s)}>{show ? <X /> : <Plus />} {show ? 'Cancel' : 'New assessment'}</Button>
      </div>

      {show && (
        <div className="mt-6 space-y-4 rounded-xl border bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Excel Fundamentals" /></div>
            <div className="space-y-1.5"><Label>Category</Label><Select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>Badge name</Label><Input value={badgeName} onChange={(e) => setBadgeName(e.target.value)} placeholder="e.g. Excel Verified" /></div>
            <div className="space-y-1.5"><Label>Badge colour</Label><Input type="color" value={badgeColor} onChange={(e) => setBadgeColor(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Seconds per question</Label><Input type="number" value={timeLimitSec} onChange={(e) => setTimeLimitSec(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Pass score (%)</Label><Input type="number" value={passScore} onChange={(e) => setPassScore(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="optional" /></div>

          <div className="space-y-3">
            <Label>Questions</Label>
            {questions.map((q, i) => (
              <div key={i} className="rounded-lg border bg-navy-50/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-navy-700">Q{i + 1}</span>
                  <Input value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} placeholder="Question text" />
                  {questions.length > 1 && <Button variant="ghost" size="icon" onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}><Trash2 className="text-red-500" /></Button>}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, oi) => (
                    <label key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${i}`} checked={q.correct === oi} onChange={() => setQ(i, { correct: oi })} title="Mark correct" />
                      <Input value={o} onChange={(e) => setOpt(i, oi, e.target.value)} placeholder={`Option ${oi + 1}`} />
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-navy-700/50">Select the radio next to the correct option.</p>
              </div>
            ))}
            <Button variant="outline" onClick={() => setQuestions((qs) => [...qs, blankQ()])}><Plus className="h-4 w-4" /> Add question</Button>
          </div>

          <Button onClick={submit} disabled={create.isPending || !valid}>{create.isPending ? <Loader2 className="animate-spin" /> : null} Create assessment</Button>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {list.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Questions</th><th className="px-4 py-3">Badge</th><th className="px-4 py-3">Active</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>
              {list.data?.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{a.title}</td>
                  <td className="px-4 py-3 capitalize text-navy-700/70">{a.categorySlug}</td>
                  <td className="px-4 py-3 text-navy-700/70">{a.questions.length}</td>
                  <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: a.badgeColor }}>{a.badgeName}</span></td>
                  <td className="px-4 py-3"><input type="checkbox" checked={a.isActive} onChange={(e) => toggle.mutate({ id: a.id, isActive: e.target.checked })} /></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm(`Delete "${a.title}"?`)) remove.mutate({ id: a.id }); }}><Trash2 className="text-red-500" /></Button></td>
                </tr>
              ))}
              {list.data?.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-navy-700/60">No assessments yet. Create one above.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
