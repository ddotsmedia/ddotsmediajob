'use client';

import { use, useState } from 'react';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { cn } from '@/lib/utils';

export default function ScheduleInterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const data = trpc.employerAts.openSlots.useQuery({ token }, { retry: false });
  const book = trpc.employerAts.bookSlot.useMutation({ onSuccess: () => setDone(true), onError: (e) => toast.error(e.message) });
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (data.isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;
  if (data.error || !data.data) return <div className="mx-auto max-w-md p-10 text-center text-navy-700/70">This scheduling link is invalid or expired.</div>;
  if (done) return <div className="mx-auto max-w-md p-10 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-green-500" /><h1 className="mt-3 font-display text-xl font-bold text-navy-900">Interview booked!</h1><p className="mt-1 text-navy-700/70">You&apos;ll receive a confirmation. See you there.</p></div>;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-navy-900">Book your interview</h1>
      <p className="mt-1 text-navy-700/70">For <strong>{data.data.jobTitle}</strong>. Times shown in your local timezone.</p>
      {data.data.slots.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed bg-white py-10 text-center text-navy-700/60">No open slots right now — please check back later.</p>
      ) : (
        <>
          <div className="mt-6 space-y-2">
            {data.data.slots.map((s) => (
              <button key={s.id} type="button" onClick={() => setSel(s.id)} className={cn('flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-colors', sel === s.id ? 'border-teal-500 bg-teal-50' : 'bg-white hover:bg-navy-50')}>
                <Clock className="h-4 w-4 text-teal-600" />
                <span className="font-medium text-navy-900">{new Date(s.startTime).toLocaleString('en-AE', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </button>
            ))}
          </div>
          <button onClick={() => sel && book.mutate({ token, slotId: sel })} disabled={!sel || book.isPending} className="mt-5 w-full rounded-lg bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {book.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Confirm interview'}
          </button>
        </>
      )}
    </div>
  );
}
