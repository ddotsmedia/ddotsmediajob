'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, MailX, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

function Unsub() {
  const token = useSearchParams().get('token') ?? '';
  const unsub = trpc.alerts.unsubscribe.useMutation();
  const fired = useRef(false);

  useEffect(() => {
    if (token && !fired.current) {
      fired.current = true;
      unsub.mutate({ token });
    }
  }, [token, unsub]);

  if (!token) return <p className="mt-6 text-center text-sm text-red-600">Invalid unsubscribe link.</p>;

  return (
    <div className="mt-6 text-center">
      {unsub.isPending && <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-500" />}
      {unsub.isSuccess && (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-teal-500" />
          <h1 className="mt-4 font-display text-xl font-bold text-navy-900">You&apos;re unsubscribed</h1>
          <p className="mt-1 text-sm text-navy-700/60">You won&apos;t receive these job alerts anymore.</p>
        </>
      )}
      {unsub.isError && <p className="mt-4 text-sm text-red-600">Something went wrong. Try the link again.</p>}
      <Button asChild variant="outline" className="mt-6"><Link href="/">Back to DdotsMediaJobs</Link></Button>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-navy-50/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex justify-center"><Logo /></div>
        <div className="mt-4 flex justify-center"><MailX className="h-8 w-8 text-navy-400" /></div>
        <Suspense fallback={<Loader2 className="mx-auto mt-6 h-10 w-10 animate-spin text-teal-500" />}>
          <Unsub />
        </Suspense>
      </div>
    </div>
  );
}
