'use client';

import { useState } from 'react';
import { ArrowBigUp, CheckCircle2, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/primitives';

export function Answers({ slug, questionId }: { slug: string; questionId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const data = trpc.communityHub.getQuestion.useQuery({ slug });
  const [text, setText] = useState('');
  const answer = trpc.communityHub.answerQuestion.useMutation({
    onSuccess: () => { utils.communityHub.getQuestion.invalidate({ slug }); setText(''); toast.success('Answer posted'); },
    onError: (e) => toast.error(e.message),
  });
  const upAns = trpc.communityHub.upvoteAnswer.useMutation({ onSuccess: () => utils.communityHub.getQuestion.invalidate({ slug }) });
  const upQ = trpc.communityHub.upvoteQuestion.useMutation({ onSuccess: () => utils.communityHub.getQuestion.invalidate({ slug }) });

  const answers = data.data?.answers ?? [];

  function send() {
    if (status !== 'authenticated') { router.push('/login'); return; }
    if (text.trim().length < 2) return;
    answer.mutate({ questionId, answer: text.trim() });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <button onClick={() => upQ.mutate({ id: questionId })} className="flex flex-col items-center text-navy-500 hover:text-teal-600"><ArrowBigUp className="h-5 w-5" /><span className="text-xs font-bold">{data.data?.question.upvotes ?? 0}</span></button>
        <h2 className="font-display text-lg font-bold text-navy-900">{answers.length} answer{answers.length === 1 ? '' : 's'}</h2>
      </div>

      <div className="mt-3 space-y-3">
        {answers.map((a, i) => (
          <div key={a.id} className="flex gap-3 rounded-xl border bg-white p-4">
            <button onClick={() => upAns.mutate({ id: a.id })} className="flex flex-col items-center text-navy-500 hover:text-teal-600"><ArrowBigUp className="h-5 w-5" /><span className="text-xs font-bold">{a.upvotes}</span></button>
            <div className="min-w-0 flex-1">
              {i === 0 && a.upvotes > 0 && <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700"><CheckCircle2 className="h-3 w-3" /> Top answer</span>}
              <p className="whitespace-pre-wrap text-sm text-navy-800">{a.answer}</p>
            </div>
          </div>
        ))}
        {answers.length === 0 && <p className="rounded-xl border border-dashed bg-white py-8 text-center text-navy-700/60">No answers yet. Share what you know.</p>}
      </div>

      <div className="mt-4 rounded-xl border bg-white p-4">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write an answer (plain text)…" />
        <Button className="mt-2" size="sm" onClick={send} disabled={answer.isPending}>{answer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post answer'}</Button>
      </div>
    </div>
  );
}
