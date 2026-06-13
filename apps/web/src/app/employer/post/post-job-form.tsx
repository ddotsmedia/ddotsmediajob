'use client';

import { useEffect, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Sparkles, Loader2, Send, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { CATEGORIES, EMIRATES, JOB_TYPES, EXPERIENCE_LEVELS, expLabel, formatSalary } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea, Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

type Draft = {
  title: string; description: string; categorySlug: string; emirateSlug: string;
  jobType: string; experienceLevel: string; salaryMin: number | null; salaryMax: number | null;
  skills: string[]; benefits: string[]; isRemote: boolean; isFresher: boolean; isUrgent: boolean;
  freeZone: boolean; isAnonymous: boolean; visaProvided: boolean; accommodationProvided: boolean;
  contactWhatsapp: string; applyEmail: string;
};

const EMPTY: Draft = {
  title: '', description: '', categorySlug: 'it', emirateSlug: '', jobType: 'full-time',
  experienceLevel: '', salaryMin: null, salaryMax: null, skills: [], benefits: [],
  isRemote: false, isFresher: false, isUrgent: false,
  freeZone: false, isAnonymous: false, visaProvided: false, accommodationProvided: false,
  contactWhatsapp: '', applyEmail: '',
};

const STEPS = ['Basics', 'Description', 'Compensation', 'Review'] as const;

export function PostJobForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const { data: session } = useSession();

  // Pre-fill the contact email from the logged-in employer's account.
  useEffect(() => {
    const email = session?.user?.email;
    if (email) setDraft((d) => (d.applyEmail ? d : { ...d, applyEmail: email }));
  }, [session?.user?.email]);

  const ai = trpc.jobs.aiQuickPost.useMutation({
    onSuccess: (d) => { setDraft({ ...EMPTY, ...d }); toast.success('Draft generated — review each step'); },
    onError: (e) => toast.error(e.message),
  });
  const create = trpc.jobs.create.useMutation({
    onSuccess: () => { toast.success('Job submitted for review!'); router.push('/employer/jobs'); },
    onError: (e) => toast.error(e.message),
  });

  const canNext =
    step === 0 ? draft.title.trim().length >= 3 && Boolean(draft.emirateSlug) && Boolean(draft.experienceLevel) :
    step === 1 ? draft.description.trim().length >= 30 :
    step === 2 ? draft.salaryMin == null || draft.salaryMax == null || draft.salaryMax >= draft.salaryMin : true;

  function publish() {
    const salaryHidden = draft.salaryMin == null && draft.salaryMax == null;
    create.mutate({
      ...draft,
      salaryPeriod: 'monthly',
      salaryHidden,
      visaStatus: 'any',
      contactWhatsapp: draft.contactWhatsapp.trim() || undefined,
      applyEmail: draft.applyEmail.trim() || undefined,
    } as never);
  }

  return (
    <div className="mt-6">
      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <button
              onClick={() => i <= step && setStep(i)}
              className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                i < step ? 'bg-teal-500 text-white' : i === step ? 'bg-navy-900 text-white' : 'bg-navy-100 text-navy-700/50')}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            <span className={cn('hidden text-sm font-medium sm:block', i === step ? 'text-navy-900' : 'text-navy-700/50')}>{s}</span>
            {i < STEPS.length - 1 && <span className={cn('h-px flex-1', i < step ? 'bg-teal-500' : 'bg-navy-100')} />}
          </li>
        ))}
      </ol>

      {/* AI quick-post (available on the first two steps) */}
      {step <= 1 && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/40 p-5">
          <Label className="flex items-center gap-2 text-teal-700"><Sparkles className="h-4 w-4" /> AI Quick Post</Label>
          <Textarea className="mt-2 bg-white" placeholder="e.g. Full-time light vehicle driver in Dubai, 2 yrs UAE exp, 3500 AED, visa provided"
            value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <Button className="mt-3" onClick={() => ai.mutate({ prompt })} disabled={ai.isPending || prompt.trim().length < 10}>
            {ai.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate with AI
          </Button>
        </div>
      )}

      <div className="space-y-5 rounded-xl border bg-white p-6">
        {step === 0 && (
          <>
            <Field label="Job title"><Input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Senior Accountant" /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Category"><Select value={draft.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
              <Field label="Emirate"><Select value={draft.emirateSlug} onChange={(e) => set('emirateSlug', e.target.value)}><option value="">Select emirate</option>{EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</Select></Field>
              <Field label="Job type"><Select value={draft.jobType} onChange={(e) => set('jobType', e.target.value)}>{JOB_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace('-', ' ')}</option>)}</Select></Field>
              <Field label="Experience"><Select value={draft.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}><option value="">Select experience</option>{EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{expLabel(l)}</option>)}</Select></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <Field label="Description">
            <Textarea className="min-h-[280px]" value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Responsibilities, requirements, benefits…" />
            <BiasCheck description={draft.description} />
          </Field>
        )}

        {step === 2 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Salary min (AED/mo)"><Input type="number" value={draft.salaryMin ?? ''} onChange={(e) => set('salaryMin', e.target.value ? Number(e.target.value) : null)} /></Field>
              <Field label="Salary max (AED/mo)"><Input type="number" value={draft.salaryMax ?? ''} onChange={(e) => set('salaryMax', e.target.value ? Number(e.target.value) : null)} /></Field>
            </div>
            <Field label="Skills (comma-separated)"><Textarea className="min-h-[80px] resize-y" value={draft.skills.join(', ')} onChange={(e) => set('skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="e.g. Excel, IELTS 6.5, UAE driving licence, customer service" /></Field>
            <Field label="Benefits (comma-separated)"><Textarea className="min-h-[80px] resize-y" value={draft.benefits.join(', ')} onChange={(e) => set('benefits', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="e.g. Visa, medical insurance, annual flight, accommodation" /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Contact WhatsApp"><Input type="tel" value={draft.contactWhatsapp} onChange={(e) => set('contactWhatsapp', e.target.value)} placeholder="+971 50 123 4567" /></Field>
              <Field label="Contact Email"><Input type="email" value={draft.applyEmail} onChange={(e) => set('applyEmail', e.target.value)} placeholder="hr@company.com" /></Field>
            </div>
            <p className="-mt-2 text-xs text-navy-700/50">Applicants reach you via WhatsApp or email — add at least one.</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {([
                ['isRemote', 'Remote'], ['isFresher', 'Fresher friendly'], ['isUrgent', 'Urgent hiring'],
                ['freeZone', 'Free zone'], ['visaProvided', 'Visa provided'],
                ['accommodationProvided', 'Accommodation'], ['isAnonymous', 'Post anonymously'],
              ] as const).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-2 text-sm text-navy-700">
                  <input type="checkbox" checked={draft[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded text-teal-600" /> {lbl}
                </label>
              ))}
            </div>
            <p className="text-xs text-navy-700/50">Salary is optional, but listings with a salary get more applications. Leave blank to show “Apply to see salary”.</p>
          </>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h3 className="font-display text-lg font-bold text-navy-900">{draft.title || 'Untitled role'}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted">{CATEGORIES.find((c) => c.slug === draft.categorySlug)?.name}</Badge>
              <Badge variant="outline">{EMIRATES.find((e) => e.slug === draft.emirateSlug)?.name}</Badge>
              <Badge>{formatSalary(draft.salaryMin, draft.salaryMax, 'monthly')}</Badge>
              {draft.isRemote && <Badge variant="success">Remote</Badge>}
              {draft.isUrgent && <Badge variant="urgent">Urgent</Badge>}
            </div>
            {/^\s*</.test(draft.description) ? (
              <div className="prose prose-sm max-w-none text-navy-700/80" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(draft.description) }} />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-navy-700/80">{draft.description || '—'}</p>
            )}
            {draft.skills.length > 0 && <div className="flex flex-wrap gap-1.5">{draft.skills.map((s) => <Badge key={s} variant="muted">{s}</Badge>)}</div>}
            <p className="text-xs text-navy-700/50">Jobs are reviewed before going live (usually within a few hours).</p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft /> Back</Button>
          {step < 3 ? (
            <Button className="w-full sm:w-auto" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Next <ArrowRight /></Button>
          ) : (
            <Button variant="accent" className="w-full sm:w-auto" onClick={publish} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="animate-spin" /> : <Send />} Submit for Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

/** Live inclusivity / bias indicator for the job description (Phase 12). */
function BiasCheck({ description }: { description: string }) {
  const check = trpc.ai.biasDetector.useMutation();
  const score = check.data ? Math.max(0, 100 - check.data.score) : null; // inclusivity score (100 = no bias)
  return (
    <div className="mt-3 rounded-lg border bg-navy-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-navy-800">Inclusivity check {score !== null && <span className={cn('ml-1 font-bold', score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600')}>{score}/100</span>}</p>
        <Button type="button" size="sm" variant="outline" disabled={description.trim().length < 20 || check.isPending} onClick={() => check.mutate({ description })}>
          {check.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Check bias
        </Button>
      </div>
      {check.data && (
        <div className="mt-2 space-y-1">
          {check.data.flags.length === 0 ? (
            <p className="flex items-center gap-1 text-xs text-green-700"><Check className="h-3.5 w-3.5" /> No biased language detected.</p>
          ) : (
            check.data.flags.map((f, i) => <p key={i} className="text-xs text-amber-700">⚠ {f}</p>)
          )}
        </div>
      )}
    </div>
  );
}
