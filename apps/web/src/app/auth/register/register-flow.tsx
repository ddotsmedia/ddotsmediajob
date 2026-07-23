'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Search, Building2, ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

type Role = 'jobseeker' | 'employer';

// Mirror the server passwordSchema exactly (jobs-shared/validators) so the client checklist
// can never pass a password the API will reject.
const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
];

export function RegisterFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = trpc.auth.register.useMutation();

  const [step, setStep] = useState<0 | 1>(0);
  const [role, setRole] = useState<Role>('jobseeker');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const pwValid = RULES.every((r) => r.test(password));
  const confirmMatches = confirm.length > 0 && confirm === password;
  const canSubmit = pwValid && confirmMatches && acceptedTerms;

  function pick(r: Role) {
    setRole(r);
    setStep(1);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return toast.error('Fill in your name and email');
    if (!pwValid) return toast.error('Password does not meet all requirements');
    if (!confirmMatches) return toast.error('Passwords do not match');
    if (!acceptedTerms) return toast.error('Please accept the Terms and Privacy Policy');
    try {
      let ref = searchParams.get('ref') ?? undefined;
      if (!ref && typeof window !== 'undefined') { try { ref = localStorage.getItem('ddots-ref') ?? undefined; } catch { /* ignore */ } }
      await register.mutateAsync({ name: name.trim(), email: email.trim(), password, role, ref, acceptedTerms: true, marketingOptIn });
      if (typeof window !== 'undefined') { try { localStorage.removeItem('ddots-ref'); } catch { /* ignore */ } }
      await signIn('credentials', { email: email.trim(), password, redirect: false });
      toast.success('Account created!');
      const cb = searchParams.get('callbackUrl');
      const dest = cb && cb.startsWith('/') && !cb.startsWith('//') ? cb : '/onboarding';
      router.push(dest);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex justify-center"><Logo /></div>

      {/* Step 1 — role pick */}
      {step === 0 ? (
        <div className="mt-6">
          <h1 className="text-center font-display text-2xl font-bold text-navy-900">Create your account</h1>
          <p className="mt-1 text-center text-sm text-navy-700/60">First — what brings you here?</p>
          <div className="mt-6 grid gap-3">
            {([
              { r: 'jobseeker' as const, icon: Search, title: 'Find a Job', sub: "I'm looking for work in the UAE." },
              { r: 'employer' as const, icon: Building2, title: 'Hire Talent', sub: "I'm an employer looking to hire." },
            ]).map(({ r, icon: Icon, title, sub }) => (
              <button
                key={r}
                type="button"
                onClick={() => pick(r)}
                className="group flex items-center gap-4 rounded-2xl border-2 border-navy-100 p-4 text-left transition-all hover:border-teal-400 hover:bg-teal-50/30"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Icon className="h-6 w-6" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold text-navy-900">{title}</span>
                  <span className="block text-sm text-navy-700/60">{sub}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-navy-300 transition-transform group-hover:translate-x-1 group-hover:text-teal-600" />
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-navy-700/70">
            Already have an account? <a href="/login" className="font-semibold text-teal-600 hover:underline">Sign in</a>
          </p>
        </div>
      ) : (
        /* Step 2 — form */
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-1 text-sm font-medium text-navy-700/70 hover:text-teal-600">
            <ArrowLeft className="h-4 w-4" /> {role === 'employer' ? 'Hire Talent' : 'Find a Job'}
          </button>

          <div className="space-y-1.5">
            <Label htmlFor="name">{role === 'employer' ? 'Company / Your name' : 'Full name'}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={role === 'employer' ? 'Acme LLC' : 'Ahmed Khan'} autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Create a strong password"
                autoComplete="new-password"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-navy-400 hover:text-navy-700"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Real-time requirement checklist */}
            <ul className="mt-2 grid grid-cols-1 gap-1">
              {RULES.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.label} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-teal-700' : 'text-navy-700/50')}>
                    {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                    {r.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
            {confirm.length > 0 && !confirmMatches && <p className="text-xs text-red-600">Passwords do not match</p>}
          </div>

          <label className="flex items-start gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded text-teal-600" />
            <span>I accept the <a href="/terms" target="_blank" className="font-semibold text-teal-600 hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="font-semibold text-teal-600 hover:underline">Privacy Policy</a>.</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-navy-700/70">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-0.5 h-4 w-4 rounded text-teal-600" />
            <span>Send me job tips and updates (optional).</span>
          </label>

          <Button type="submit" className="w-full" disabled={register.isPending || !canSubmit}>
            {register.isPending && <Loader2 className="animate-spin" />} Create account
          </Button>
        </form>
      )}
    </div>
  );
}
