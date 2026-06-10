'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardCheck, Loader2, Plus, Trash2, X } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Input, Label, Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

type Item = { competency: string; weight: number; score: number };
const blank = (): Item => ({ competency: '', weight: 20, score: 3 });

const REC_LABEL: Record<string, string> = { strong_hire: 'Strong hire', hire: 'Hire', maybe: 'Maybe', no_hire: 'No hire' };

function weighted(items: Item[]): number {
  const tw = items.reduce((s, i) => s + i.weight, 0);
  if (tw <= 0) return 0;
  return Math.round((items.reduce((s, i) => s + (i.score / 5) * i.weight, 0) / tw) * 100);
}

export default function ScorecardsPage() {
  const utils = trpc.useUtils();
  const list = trpc.scorecards.list.useQuery();
  const create = trpc.scorecards.create.useMutation({ onSuccess: () => { utils.scorecards.list.invalidate(); toast.success('Scorecard saved'); reset(); } });
  const remove = trpc.scorecards.remove.useMutation({ onSuccess: () => { utils.scorecards.list.invalidate(); } });

  const [show, setShow] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Item[]>([blank(), blank(), blank()]);

  function reset() { setShow(false); setCandidateName(''); setRecommendation(''); setNotes(''); setItems([blank(), blank(), blank()]); }
  function setItem(i: number, patch: Partial<Item>) { setItems((xs) => xs.map((x, idx) => (idx === i ? { ...x, ...patch } : x))); }

  const valid = candidateName.trim().length > 0 && items.every((i) => i.competency.trim().length > 0);

  function submit() {
    if (!valid) { toast.error('Add a candidate name and name every competency'); return; }
    create.mutate({
      candidateName, notes: notes || undefined,
      recommendation: recommendation ? (recommendation as 'strong_hire' | 'hire' | 'maybe' | 'no_hire') : undefined,
      items: items.map((i) => ({ competency: i.competency, weight: i.weight, score: i.score })),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Interview Scorecards</h1></div>
        <Button onClick={() => setShow((s) => !s)}>{show ? <X /> : <Plus />} {show ? 'Cancel' : 'New scorecard'}</Button>
      </div>

      {show && (
        <div className="mt-6 space-y-4 rounded-xl border bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Candidate name</Label><Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="e.g. Ahmed K." /></div>
            <div className="space-y-1.5"><Label>Recommendation</Label><Select value={recommendation} onChange={(e) => setRecommendation(e.target.value)}><option value="">—</option>{Object.entries(REC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Competencies (weight 0-100, score 0-5)</Label><span className="font-display text-lg font-bold text-teal-700">{weighted(items)}%</span></div>
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={it.competency} onChange={(e) => setItem(i, { competency: e.target.value })} placeholder="e.g. Technical skill" />
                <Input type="number" className="w-20" value={String(it.weight)} onChange={(e) => setItem(i, { weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} title="Weight" />
                <Input type="number" className="w-16" value={String(it.score)} onChange={(e) => setItem(i, { score: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })} title="Score 0-5" />
                {items.length > 1 && <Button variant="ghost" size="icon" onClick={() => setItems((xs) => xs.filter((_, idx) => idx !== i))}><Trash2 className="text-red-500" /></Button>}
              </div>
            ))}
            <Button variant="outline" onClick={() => setItems((xs) => [...xs, blank()])}><Plus className="h-4 w-4" /> Add competency</Button>
          </div>

          <div className="space-y-1.5"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" /></div>
          <Button onClick={submit} disabled={create.isPending || !valid}>{create.isPending ? <Loader2 className="animate-spin" /> : null} Save scorecard</Button>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {list.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700"><tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Recommendation</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>
              {list.data?.map((s, i) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-4 py-3"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-gold-100 text-gold-700' : 'bg-navy-100 text-navy-700'}`}>{i + 1}</span></td>
                  <td className="px-4 py-3 font-medium text-navy-900">{s.candidateName}</td>
                  <td className="px-4 py-3 font-bold text-teal-700">{Math.round(s.weightedTotal)}%</td>
                  <td className="px-4 py-3 text-navy-700/70">{s.recommendation ? REC_LABEL[s.recommendation] ?? s.recommendation : '—'}</td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete scorecard for ${s.candidateName}?`)) remove.mutate({ id: s.id }); }}><Trash2 className="text-red-500" /></Button></td>
                </tr>
              ))}
              {list.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-navy-700/60">No scorecards yet. Create one to rank candidates.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
