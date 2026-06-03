'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, MailCheck } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const req = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
    onError: () => setSent(true), // never reveal whether the email exists
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-navy-50/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex justify-center"><Logo /></div>
        {sent ? (
          <div className="mt-6 text-center">
            <MailCheck className="mx-auto h-12 w-12 text-teal-500" />
            <h1 className="mt-4 font-display text-xl font-bold text-navy-900">Check your email</h1>
            <p className="mt-1 text-sm text-navy-700/60">If an account exists, we've sent a reset link. It expires in 1 hour.</p>
            <Button asChild variant="outline" className="mt-6"><Link href="/login">Back to sign in</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-center font-display text-2xl font-bold text-navy-900">Forgot password?</h1>
            <p className="mt-1 text-center text-sm text-navy-700/60">Enter your email and we'll send a reset link.</p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                req.mutate({ email: String(new FormData(e.currentTarget).get('email')) });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@example.com" />
              </div>
              <Button type="submit" className="w-full" disabled={req.isPending}>
                {req.isPending && <Loader2 className="animate-spin" />} Send reset link
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-navy-700/70">
              <Link href="/login" className="font-semibold text-teal-600 hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
