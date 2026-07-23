'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';
import '@uploadthing/react/styles.css';
import {
  Search, Building2, FileText, ArrowRight, CheckCircle2, Briefcase,
  Users, MessageCircle, LayoutDashboard, Loader2,
} from 'lucide-react';
import { trpc } from '@/trpc/react';
import { UploadButton } from '@/lib/uploadthing-client';
import { Button } from '@/components/ui/button';

type Intent = 'jobseeker' | 'employer';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [finishing, setFinishing] = useState(false);
  const becomeEmployer = trpc.auth.becomeEmployer.useMutation();
  const uploadResume = trpc.jobseekers.uploadResume.useMutation();

  // After a CV lands, parse it via the AI provider cascade and surface a rich summary.
  async function onCvUploaded(res: { ufsUrl?: string; url?: string; name?: string }[]) {
    const file = res?.[0];
    const url = file?.ufsUrl ?? file?.url;
    if (!url) { toast.error('Upload failed. Please try again or contact support.'); return; }
    try {
      const r = await uploadResume.mutateAsync({ resumeUrl: url, filename: file?.name ?? 'cv.pdf' });
      if (r.parsed) {
        const loc = r.location[0] ? `, ${r.location[0]}` : '';
        toast.success(`CV analyzed! ${r.skills_detected} skills detected, ${r.experience_years} years experience${loc}. Employers can now find you in AI CV Search.`);
      } else {
        toast.message("We're reviewing your CV manually. Check back in 24h.");
      }
    } catch {
      toast.error('Upload failed. Please try again or contact support.');
    }
    setStep(2);
  }

  // Onboarding needs a signed-in user.
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?callbackUrl=/onboarding');
  }, [status, router]);

  if (status !== 'authenticated') {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>;
  }

  async function pickJobseeker() {
    setIntent('jobseeker');
    setStep(1);
  }

  async function pickEmployer() {
    setIntent('employer');
    try {
      await becomeEmployer.mutateAsync();
      await update({ role: 'employer' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not switch to employer');
    }
    setStep(2);
  }

  async function finish() {
    setFinishing(true);
    // Clear the new-user flag so middleware stops routing back here.
    await update({ onboarded: true });
    const role = intent === 'employer' ? 'employer' : session?.user?.role;
    router.push(role === 'employer' ? '/employer' : role === 'admin' ? '/admin' : '/dashboard');
    router.refresh();
  }

  const isEmployer = intent === 'employer';

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-8">
      {/* Progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-teal-500' : i < step ? 'w-2 bg-teal-500' : 'w-2 bg-navy-200'}`} />
        ))}
      </div>

      {/* Step 1 — intent */}
      {step === 0 && (
        <div>
          <h1 className="text-center font-display text-2xl font-bold text-navy-900 sm:text-3xl">What are you looking for?</h1>
          <p className="mt-2 text-center text-navy-700/60">Choose one to personalise your experience.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              onClick={pickJobseeker}
              className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-navy-100 bg-white p-6 text-left transition-all hover:border-teal-400 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Search className="h-6 w-6" /></span>
              <span className="font-display text-lg font-bold text-navy-900">Find a Job</span>
              <span className="text-sm text-navy-700/60">I&apos;m looking for work in the UAE.</span>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-teal-600">Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </button>
            <button
              onClick={pickEmployer}
              disabled={becomeEmployer.isPending}
              className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-navy-100 bg-white p-6 text-left transition-all hover:border-teal-400 hover:shadow-md disabled:opacity-60"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Building2 className="h-6 w-6" /></span>
              <span className="font-display text-lg font-bold text-navy-900">Hire Talent</span>
              <span className="text-sm text-navy-700/60">I&apos;m an employer looking to hire.</span>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-teal-600">
                {becomeEmployer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — CV upload (jobseekers only) */}
      {step === 1 && (
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><FileText className="h-7 w-7" /></span>
          <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Upload your CV to get noticed by employers</h1>
          <p className="mt-2 text-navy-700/60">Employers search our CV database daily. PDF or Word, max 4&nbsp;MB.</p>
          <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border bg-white p-8">
            {uploadResume.isPending ? (
              <p className="flex items-center gap-2 text-sm font-medium text-teal-700"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing your CV…</p>
            ) : (
              <UploadButton
                endpoint="cvUploader"
                onClientUploadComplete={onCvUploaded}
                onUploadError={(err) => { toast.error(err.message); }}
              />
            )}
            <p className="text-xs text-navy-700/50">We extract your skills automatically.</p>
          </div>
          <button onClick={() => setStep(2)} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-navy-700/70 hover:text-teal-600">
            Skip for now <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 3 — confirmation */}
      {step === 2 && (
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600"><CheckCircle2 className="h-9 w-9" /></span>
          <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">You&apos;re all set!</h1>
          <p className="mt-2 text-navy-700/60">{isEmployer ? 'Start hiring the best talent in the UAE.' : 'Here&apos;s what you can do next.'}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {(isEmployer
              ? [
                  { href: '/employer/post', icon: Briefcase, label: 'Post a Job' },
                  { href: '/employer/candidates', icon: Search, label: 'Search CVs' },
                  { href: '/employer', icon: LayoutDashboard, label: 'View Dashboard' },
                ]
              : [
                  { href: '/jobs', icon: Search, label: 'Browse Jobs' },
                  { href: '/dashboard/profile', icon: Users, label: 'Complete Profile' },
                  { href: '/whatsapp-groups', icon: MessageCircle, label: 'WhatsApp Groups' },
                ]
            ).map((c) => (
              <Link key={c.href} href={c.href} className="flex flex-col items-center gap-2 rounded-xl border bg-white p-5 text-sm font-semibold text-navy-800 transition-all hover:border-teal-400 hover:shadow-sm">
                <c.icon className="h-6 w-6 text-teal-600" />
                {c.label}
              </Link>
            ))}
          </div>

          <Button onClick={finish} disabled={finishing} className="mt-8 w-full sm:w-auto">
            {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Go to Dashboard <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </div>
      )}
    </div>
  );
}
