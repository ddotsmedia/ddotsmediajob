'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('callbackUrl');
  // Open-redirect guard: same-origin relative paths only.
  const explicitCallback = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
  const [loading, setLoading] = useState(false);
  const [show2fa, setShow2fa] = useState(false);

  const roleHome = (role?: string) =>
    role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : role === 'volunteer' ? '/volunteer' : '/dashboard';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn('credentials', {
      email: String(form.get('email')),
      password: String(form.get('password')),
      totp: String(form.get('totp') ?? ''),
      redirect: false,
    });
    if (res?.error) {
      setLoading(false);
      toast.error('Invalid email or password');
      return;
    }
    // Route to the correct panel for this role (unless a specific page was requested).
    const session = await getSession();
    setLoading(false);
    toast.success('Signed in');
    router.push(explicitCallback ?? roleHome(session?.user?.role));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a href="/forgot-password" className="text-xs font-medium text-teal-600 hover:underline">Forgot password?</a>
          </div>
          <Input id="password" name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
        </div>
        {show2fa ? (
          <div className="space-y-1.5">
            <Label htmlFor="totp">Authenticator code</Label>
            <Input id="totp" name="totp" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code or backup code" />
          </div>
        ) : (
          <button type="button" onClick={() => setShow2fa(true)} className="text-xs font-medium text-teal-600 hover:underline">
            Have two-factor authentication enabled?
          </button>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Sign in
        </Button>
      </form>
    </div>
  );
}

