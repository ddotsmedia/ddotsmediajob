'use client';

import { useState } from 'react';
import { ArrowBigUp, Loader2, CheckCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';

export function AmaQuestions({ slug, sessionId }: { slug: string; sessionId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [text, setText] = useState('');

  const data = trpc.ama.bySlug.useQuery({ slug });
  const submit = trpc.ama.submitQuestion.useMutation({
    onSuccess: () => { setText(''); utils.ama.bySlug.invalidate({ slug }); toast.success('Question submitted'); },
    onError: (e) => toast.error(e.message),
  });
  const upvote = trpc.ama.upvoteQuestion.useMutation({ onSuccess: () => utils.ama.bySlug.invalidate({ slug }) });

  function send() {
    if (status !== 'authenticated') { router.push('/login'); return; }
    if (text.trim().length < 5) { toast.error('Question is too short'); return; }
    submit.mutate({ sessionId, question: text.trim() });
  }

  const questions = data.data?.questions ?? [];

  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="font-display text-lg font-bold text-navy-900">Q&amp;A</h3>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask a question…"
          maxLength={500}
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <button onClick={send} disabled={submit.isPending} className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
          {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
        </button>
      </div>

      <div className="mt-4">
        {data.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-teal-500" /></div>
        ) : questions.length === 0 ? (
          <p className="py-8 text-center text-sm text-navy-700/50">No questions yet — be the first to ask.</p>
        ) : (
          questions.map((qq) => (
            <div key={qq.id} className="flex gap-3 border-b px-1 py-3 last:border-0">
              <button onClick={() => upvote.mutate({ id: qq.id })} className="flex flex-col items-center text-navy-500 hover:text-teal-600" aria-label="Upvote">
                <ArrowBigUp className="h-5 w-5" />
                <span className="text-xs font-bold">{qq.upvotes}</span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-navy-900">{qq.question}</p>
                {qq.answered && qq.answer && (
                  <p className="mt-1 flex items-start gap-1 text-sm text-navy-700/70"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> {qq.answer}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
