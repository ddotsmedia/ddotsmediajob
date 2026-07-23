'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<'jobseeker' | 'employer'>('jobseeker');
  const register = trpc.auth.register.useMutation();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    if (password !== String(form.get('confirm'))) return toast.error('Passwords do not match');
    if (form.get('acceptedTerms') !== 'on') return toast.error('Please accept the Terms and Privacy Policy');
    try {
      let ref = searchParams.get('ref') ?? undefined;
      if (!ref && typeof window !== 'undefined') { try { ref = localStorage.getItem('ddots-ref') ?? undefined; } catch { /* ignore */ } }
      await register.mutateAsync({ name: String(form.get('name')), email, password, role, ref, acceptedTerms: true, marketingOptIn: form.get('marketingOptIn') === 'on' });
      if (typeof window !== 'undefined') { try { localStorage.removeItem('ddots-ref'); } catch { /* ignore */ } }
      await signIn('credentials', { email, password, redirect: false });
      toast.success('Account created!');
      // Honor callbackUrl (same-origin only) — e.g. guest clicked "Post a Job" → /employer/post.
      // Otherwise send new users through onboarding (role pick + CV upload) before their dashboard.
      const cb = searchParams.get('callbackUrl');
      const dest = cb && cb.startsWith('/') && !cb.startsWith('//') ? cb : '/onboarding';
      router.push(dest);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(['jobseeker', 'employer'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              'rounded-lg border py-2.5 text-sm font-semibold capitalize transition-colors',
              role === r ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-navy-200 text-navy-700 hover:bg-navy-50',
            )}
          >
            {r === 'jobseeker' ? 'Find a Job' : 'Hire Talent'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">{role === 'employer' ? 'Company / Your name' : 'Full name'}</Label>
        <Input id="name" name="name" required placeholder={role === 'employer' ? 'Acme LLC' : 'Ahmed Khan'} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} placeholder="Re-enter your password" autoComplete="new-password" />
      </div>

      <label className="flex items-start gap-2 text-sm text-navy-700">
        <input type="checkbox" name="acceptedTerms" required className="mt-0.5 h-4 w-4 rounded text-teal-600" />
        <span>I accept the <a href="/terms" target="_blank" className="font-semibold text-teal-600 hover:underline">Terms</a> and <a href="/privacy" target="_blank" className="font-semibold text-teal-600 hover:underline">Privacy Policy</a>.</span>
      </label>
      <label className="flex items-start gap-2 text-sm text-navy-700/70">
        <input type="checkbox" name="marketingOptIn" className="mt-0.5 h-4 w-4 rounded text-teal-600" />
        <span>Send me job tips and updates (optional).</span>
      </label>

      <Button type="submit" className="w-full" disabled={register.isPending}>
        {register.isPending && <Loader2 className="animate-spin" />} Create account
      </Button>
    </form>
  );
}
