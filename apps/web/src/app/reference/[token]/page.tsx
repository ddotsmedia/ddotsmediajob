'use client';

import { use, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Textarea, Label } from '@/components/ui/primitives';

const QUESTIONS = [
  { id: 'q1', q: 'How long have you known the candidate and in what capacity?' },
  { id: 'q2', q: 'Rate their work quality (1-5) and briefly explain.' },
  { id: 'q3', q: 'Rate their reliability and attendance (1-5).' },
  { id: 'q4', q: "Describe their biggest strength." },
  { id: 'q5', q: 'Would you rehire them? (Yes / No / Yes with reservations)' },
  { id: 'q6', q: 'Any concerns the employer should know?' },
];

export default function ReferencePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const info = trpc.employerAts.referenceByToken.useQuery({ token }, { retry: false });
  const submit = trpc.employerAts.submitReference.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => toast.error(e.message),
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  if (info.isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;
  if (info.error || !info.data) return <div className="mx-auto max-w-md p-10 text-center text-navy-700/70">This reference link is invalid or already completed.</div>;
  if (done) return <div className="mx-auto max-w-md p-10 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-green-500" /><h1 className="mt-3 font-display text-xl font-bold text-navy-900">Thank you!</h1><p className="mt-1 text-navy-700/70">Your reference has been submitted.</p></div>;

  function send() {
    for (const q of QUESTIONS) if (!answers[q.id]?.trim()) { toast.error('Please answer all questions'); return; }
    submit.mutate({ token, answers });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-navy-900">Reference check</h1>
      <p className="mt-1 text-navy-700/70">A candidate listed you as a reference. 6 quick questions — about 5 minutes.</p>
      <div className="mt-6 space-y-4">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="rounded-xl border bg-white p-4">
            <Label>{q.q}</Label>
            <Textarea className="mt-1.5" value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
          </div>
        ))}
      </div>
      <Button className="mt-5" onClick={send} disabled={submit.isPending}>{submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit reference'}</Button>
    </div>
  );
}
