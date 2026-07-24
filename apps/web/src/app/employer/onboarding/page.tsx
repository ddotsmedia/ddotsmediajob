'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, FileText, Globe, CheckCircle2, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/primitives';

const SIZES = ['1-10', '11-50', '51-200', '201-500', '500-1000', '1000-plus'] as const;
const STEPS = ['Company', 'Legal', 'Website', 'Review'];
const isDomain = (u: string) => /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(u.trim());

export default function EmployerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ companyName: '', industry: '', size: '', emirateSlug: '', legalName: '', registrationNumber: '', website: '' });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const save = trpc.employers.completeOnboarding.useMutation({
    onSuccess: (r) => { toast.success(r.message); router.push('/employer'); router.refresh(); },
    onError: (e) => toast.error(e.message),
  });

  const canNext = step === 0 ? f.companyName.trim().length >= 2 : step === 2 ? (!f.website || isDomain(f.website)) : true;

  function submit() {
    const website = f.website.trim();
    if (website && !isDomain(website)) return toast.error('Enter a valid website domain');
    save.mutate({
      companyName: f.companyName.trim(),
      industry: f.industry.trim() || undefined,
      size: (f.size || undefined) as (typeof SIZES)[number] | undefined,
      emirateSlug: f.emirateSlug || undefined,
      legalName: f.legalName.trim() || undefined,
      registrationNumber: f.registrationNumber.trim() || undefined,
      website: website ? (website.startsWith('http') ? website : `https://${website}`) : '',
    });
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-navy-900">Employer verification</h1>
      <p className="mt-1 text-sm text-navy-700/60">Company details get you Basic; legal details + website unlock Enhanced review.</p>

      {/* Progress */}
      <div className="mt-5 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? 'bg-teal-500' : 'bg-navy-100'}`} />
            <span className={`mt-1 block text-[11px] ${i === step ? 'font-semibold text-teal-700' : 'text-navy-700/50'}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border bg-white p-5">
        {step === 0 && (
          <>
            <SectionTitle icon={Building2} title="Company information" hint="Verifies you to Basic." />
            <Field label="Company name *"><Input value={f.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="Acme Trading LLC" /></Field>
            <Field label="Industry"><Input value={f.industry} onChange={(e) => set('industry', e.target.value)} placeholder="e.g. Construction" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company size"><Select value={f.size} onChange={(e) => set('size', e.target.value)}><option value="">Select</option>{SIZES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
              <Field label="Emirate"><Select value={f.emirateSlug} onChange={(e) => set('emirateSlug', e.target.value)}><option value="">Select</option>{EMIRATES.map((em) => <option key={em.slug} value={em.slug}>{em.name}</option>)}</Select></Field>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <SectionTitle icon={FileText} title="Legal details (optional)" hint="Submits your company for Enhanced review." />
            <Field label="Legal / registered name"><Input value={f.legalName} onChange={(e) => set('legalName', e.target.value)} placeholder="Acme Trading L.L.C." /></Field>
            <Field label="Trade licence / registration number"><Input value={f.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} placeholder="CN-1234567" /></Field>
          </>
        )}
        {step === 2 && (
          <>
            <SectionTitle icon={Globe} title="Website (optional)" hint="A verified domain strengthens Enhanced review." />
            <Field label="Company website"><Input value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="acme.ae" /></Field>
            {f.website && !isDomain(f.website) && <p className="text-xs text-red-600">Enter a valid domain (e.g. acme.ae).</p>}
          </>
        )}
        {step === 3 && (
          <>
            <SectionTitle icon={CheckCircle2} title="Review & submit" hint="" />
            <dl className="space-y-1.5 text-sm">
              <Row k="Company" v={f.companyName || '—'} />
              <Row k="Industry" v={f.industry || '—'} />
              <Row k="Size" v={f.size || '—'} />
              <Row k="Emirate" v={EMIRATES.find((e) => e.slug === f.emirateSlug)?.name ?? '—'} />
              <Row k="Legal name" v={f.legalName || '—'} />
              <Row k="Registration no." v={f.registrationNumber || '—'} />
              <Row k="Website" v={f.website || '—'} />
            </dl>
            <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">
              {(f.legalName || f.registrationNumber || f.website) ? 'You will get Basic now and be queued for Enhanced review.' : 'You will get Basic verification now.'}
            </p>
          </>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Next <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button onClick={submit} disabled={save.isPending || f.companyName.trim().length < 2}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Submit</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function SectionTitle({ icon: Icon, title, hint }: { icon: typeof Building2; title: string; hint: string }) {
  return (
    <div>
      <h2 className="flex items-center gap-2 font-display font-bold text-navy-900"><Icon className="h-4 w-4 text-teal-500" /> {title}</h2>
      {hint && <p className="mt-0.5 text-xs text-navy-700/60">{hint}</p>}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-navy-700/60">{k}</dt><dd className="min-w-0 truncate font-medium text-navy-900">{v}</dd></div>;
}
