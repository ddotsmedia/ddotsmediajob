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
    try {
      let ref = searchParams.get('ref') ?? undefined;
      if (!ref && typeof window !== 'undefined') { try { ref = localStorage.getItem('ddots-ref') ?? undefined; } catch { /* ignore */ } }
      await register.mutateAsync({ name: String(form.get('name')), email, password, role, ref });
      if (typeof window !== 'undefined') { try { localStorage.removeItem('ddots-ref'); } catch { /* ignore */ } }
      await signIn('credentials', { email, password, redirect: false });
      toast.success('Account created!');
      router.push(role === 'employer' ? '/employer' : '/dashboard');
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

      <Button type="submit" className="w-full" disabled={register.isPending}>
        {register.isPending && <Loader2 className="animate-spin" />} Create account
      </Button>
    </form>
  );
}
