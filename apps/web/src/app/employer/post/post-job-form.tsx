'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Loader2, Send, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { CATEGORIES, EMIRATES, JOB_TYPES, EXPERIENCE_LEVELS, formatSalary } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea, Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

type Draft = {
  title: string; description: string; categorySlug: string; emirateSlug: string;
  jobType: string; experienceLevel: string; salaryMin: number | null; salaryMax: number | null;
  skills: string[]; benefits: string[]; isRemote: boolean; isFresher: boolean; isUrgent: boolean;
  freeZone: boolean; isAnonymous: boolean; visaProvided: boolean; accommodationProvided: boolean;
};

const EMPTY: Draft = {
  title: '', description: '', categorySlug: 'it', emirateSlug: 'dubai', jobType: 'full-time',
  experienceLevel: '1-3-years', salaryMin: null, salaryMax: null, skills: [], benefits: [],
  isRemote: false, isFresher: false, isUrgent: false,
  freeZone: false, isAnonymous: false, visaProvided: false, accommodationProvided: false,
};

const STEPS = ['Basics', 'Description', 'Compensation', 'Review'] as const;

export function PostJobForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const ai = trpc.jobs.aiQuickPost.useMutation({
    onSuccess: (d) => { setDraft({ ...EMPTY, ...d }); toast.success('Draft generated — review each step'); },
    onError: (e) => toast.error(e.message),
  });
  const create = trpc.jobs.create.useMutation({
    onSuccess: () => { toast.success('Job submitted for review!'); router.push('/employer/jobs'); },
    onError: (e) => toast.error(e.message),
  });

  const canNext =
    step === 0 ? draft.title.trim().length >= 3 :
    step === 1 ? draft.description.trim().length >= 30 :
    step === 2 ? draft.salaryMin != null && draft.salaryMax != null && draft.salaryMax >= draft.salaryMin : true;

  function publish() {
    create.mutate({ ...draft, salaryPeriod: 'monthly', salaryHidden: false, visaStatus: 'any' } as never);
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
              <Field label="Emirate"><Select value={draft.emirateSlug} onChange={(e) => set('emirateSlug', e.target.value)}>{EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</Select></Field>
              <Field label="Job type"><Select value={draft.jobType} onChange={(e) => set('jobType', e.target.value)}>{JOB_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace('-', ' ')}</option>)}</Select></Field>
              <Field label="Experience"><Select value={draft.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}>{EXPERIENCE_LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l.replace(/-/g, ' ')}</option>)}</Select></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <Field label="Description">
            <Textarea className="min-h-[280px]" value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Responsibilities, requirements, benefits…" />
          </Field>
        )}

        {step === 2 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Salary min (AED/mo)"><Input type="number" value={draft.salaryMin ?? ''} onChange={(e) => set('salaryMin', e.target.value ? Number(e.target.value) : null)} /></Field>
              <Field label="Salary max (AED/mo)"><Input type="number" value={draft.salaryMax ?? ''} onChange={(e) => set('salaryMax', e.target.value ? Number(e.target.value) : null)} /></Field>
            </div>
            <Field label="Skills (comma-separated)"><Input value={draft.skills.join(', ')} onChange={(e) => set('skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
            <Field label="Benefits (comma-separated)"><Input value={draft.benefits.join(', ')} onChange={(e) => set('benefits', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
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
            <p className="text-xs text-navy-700/50">Salary range is required — listings with salary get more applications.</p>
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
            <p className="whitespace-pre-wrap text-sm text-navy-700/80">{draft.description || '—'}</p>
            {draft.skills.length > 0 && <div className="flex flex-wrap gap-1.5">{draft.skills.map((s) => <Badge key={s} variant="muted">{s}</Badge>)}</div>}
            <p className="text-xs text-navy-700/50">Jobs are reviewed before going live (usually within a few hours).</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft /> Back</Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Next <ArrowRight /></Button>
          ) : (
            <Button variant="accent" onClick={publish} disabled={create.isPending}>
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
