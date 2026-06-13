'use client';

import { useState } from 'react';
import { BarChart3, Plus, Loader2 } from 'lucide-react';
import { CATEGORIES, EMIRATES } from '@ddots/shared';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/primitives';

export default function AdminPollsPage() {
  const utils = trpc.useUtils();
  const list = trpc.communityHub.adminListPolls.useQuery();
  const create = trpc.communityHub.createPoll.useMutation({
    onSuccess: () => { utils.communityHub.adminListPolls.invalidate(); toast.success('Poll created'); setQuestion(''); setOptions(['', '', '', '']); },
    onError: (e) => toast.error(e.message),
  });
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [cat, setCat] = useState<string>('');
  const [em, setEm] = useState<string>('');
  const [days, setDays] = useState(7);

  function submit() {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 5 || opts.length < 2) return toast.error('Question + at least 2 options required');
    create.mutate({ question, options: opts, categorySlug: cat || undefined, emirate: em || undefined, durationDays: days });
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Salary polls</h1></div>

      <div className="mt-5 space-y-3 rounded-xl border bg-white p-5">
        <div className="space-y-1.5"><Label>Question</Label><Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What salary range are you earning as a Nurse in Dubai?" /></div>
        <div className="space-y-1.5"><Label>Options</Label>{options.map((o, i) => <Input key={i} value={o} onChange={(e) => setOptions((p) => p.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${i + 1}`} className="mt-1" />)}</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label>Category</Label><Select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Any</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></div>
          <div className="space-y-1.5"><Label>Emirate</Label><Select value={em} onChange={(e) => setEm(e.target.value)}><option value="">Any</option>{EMIRATES.map((e2) => <option key={e2.slug} value={e2.slug}>{e2.name}</option>)}</Select></div>
          <div className="space-y-1.5"><Label>Days</Label><Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value) || 7)} /></div>
        </div>
        <Button onClick={submit} disabled={create.isPending}>{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create poll</Button>
      </div>

      <div className="mt-6 space-y-2">
        {list.data?.map((p) => (
          <div key={p.id} className="rounded-xl border bg-white p-4">
            <p className="font-medium text-navy-900">{p.question}</p>
            <p className="text-xs text-navy-700/60">{p.options.length} options · {p.categorySlug ?? 'any'} / {p.emirate ?? 'any'} · ends {p.endsAt ? new Date(p.endsAt).toLocaleDateString('en-AE') : '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
