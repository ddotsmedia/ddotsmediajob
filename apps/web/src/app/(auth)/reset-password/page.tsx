'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success('Password updated — please sign in');
      router.push('/login');
    },
    onError: (e) => toast.error(e.message),
  });

  if (!token) {
    return <p className="mt-6 text-center text-sm text-red-600">Missing reset token. Use the link from your email.</p>;
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const pw = String(f.get('password'));
        if (pw !== String(f.get('confirm'))) return toast.error('Passwords do not match');
        reset.mutate({ token, password: pw });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} />
      </div>
      <Button type="submit" className="w-full" disabled={reset.isPending}>
        {reset.isPending && <Loader2 className="animate-spin" />} Update password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-navy-50/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-navy-900">Set a new password</h1>
        <Suspense><ResetForm /></Suspense>
        <p className="mt-6 text-center text-sm text-navy-700/70">
          <Link href="/login" className="font-semibold text-teal-600 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
