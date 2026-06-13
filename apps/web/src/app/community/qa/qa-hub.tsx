'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowBigUp, Loader2, Plus } from 'lucide-react';
import { CATEGORIES, categoryBySlug } from '@ddots/shared';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Textarea, Select, Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export function QaHub() {
  const { status } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [cat, setCat] = useState('');
  const [filter, setFilter] = useState<'recent' | 'unanswered' | 'top'>('recent');
  const [asking, setAsking] = useState(false);
  const [qText, setQText] = useState('');
  const [qCat, setQCat] = useState<string>(CATEGORIES[0]!.slug);

  const list = trpc.communityHub.getQuestions.useQuery({ category: cat || undefined, filter });
  const create = trpc.communityHub.createQuestion.useMutation({
    onSuccess: () => { utils.communityHub.getQuestions.invalidate(); setAsking(false); setQText(''); toast.success('Question posted'); },
    onError: (e) => toast.error(e.message),
  });

  function ask() {
    if (status !== 'authenticated') { router.push('/login'); return; }
    if (qText.trim().length < 20) { toast.error('Question must be at least 20 characters'); return; }
    create.mutate({ categorySlug: qCat, question: qText.trim() });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Community Q&amp;A</h1></div>
        <Button size="sm" onClick={() => setAsking((a) => !a)}><Plus className="h-4 w-4" /> Ask</Button>
      </div>

      {asking && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <Select value={qCat} onChange={(e) => setQCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select>
          <Textarea className="mt-2" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Your question (min 20 chars). Phone numbers and emails are removed automatically." />
          <Button className="mt-2" size="sm" onClick={ask} disabled={create.isPending}>{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post question'}</Button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => setCat('')} className={cn('rounded-full px-3 py-1 text-xs font-semibold', !cat ? 'bg-teal-600 text-white' : 'bg-white ring-1 ring-navy-200 text-navy-700')}>All</button>
        {CATEGORIES.map((c) => <button key={c.slug} onClick={() => setCat(c.slug)} className={cn('rounded-full px-3 py-1 text-xs font-semibold', cat === c.slug ? 'bg-teal-600 text-white' : 'bg-white ring-1 ring-navy-200 text-navy-700')}>{c.name}</button>)}
      </div>
      <div className="mt-2 flex gap-2 text-xs">
        {(['recent', 'unanswered', 'top'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={cn('rounded-full px-2.5 py-1 capitalize', filter === f ? 'bg-navy-900 text-white' : 'text-navy-600')}>{f}</button>)}
      </div>

      <div className="mt-5 space-y-2">
        {list.isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-500" /></div>
          : !list.data?.length ? <p className="rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No questions yet. Be the first to ask.</p>
          : list.data.map((q) => (
            <Link key={q.id} href={`/community/qa/${q.slug}`} className="block rounded-xl border bg-white p-4 hover:border-teal-300">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-navy-900">{q.question}</p>
                {q.categorySlug && <Badge variant="muted">{categoryBySlug(q.categorySlug)?.name ?? q.categorySlug}</Badge>}
              </div>
              <p className="mt-1 flex items-center gap-3 text-xs text-navy-700/50"><span className="inline-flex items-center gap-1"><ArrowBigUp className="h-3.5 w-3.5" /> {q.upvotes}</span><span>{q.answerCount} answers</span></p>
            </Link>
          ))}
      </div>
    </div>
  );
}
