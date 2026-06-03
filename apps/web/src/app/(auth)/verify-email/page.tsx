'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

function Verifier() {
  const token = useSearchParams().get('token') ?? '';
  const verify = trpc.auth.verifyEmail.useMutation();
  const fired = useRef(false);

  useEffect(() => {
    if (token && !fired.current) {
      fired.current = true;
      verify.mutate({ token });
    }
  }, [token, verify]);

  if (!token) return <p className="mt-6 text-center text-sm text-red-600">Missing verification token.</p>;

  return (
    <div className="mt-6 text-center">
      {verify.isPending && <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-500" />}
      {verify.isSuccess && (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-lime-500" />
          <h1 className="mt-4 font-display text-xl font-bold text-navy-900">Email verified 🎉</h1>
          <p className="mt-1 text-sm text-navy-700/60">Your account is now fully active.</p>
          <Button asChild className="mt-6"><Link href="/dashboard">Go to dashboard</Link></Button>
        </>
      )}
      {verify.isError && (
        <>
          <XCircle className="mx-auto h-12 w-12 text-accent-500" />
          <h1 className="mt-4 font-display text-xl font-bold text-navy-900">Link invalid or expired</h1>
          <p className="mt-1 text-sm text-navy-700/60">{verify.error.message}</p>
          <Button asChild variant="outline" className="mt-6"><Link href="/dashboard">Go to dashboard</Link></Button>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-navy-50/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        <div className="flex justify-center"><Logo /></div>
        <Suspense><Verifier /></Suspense>
      </div>
    </div>
  );
}
