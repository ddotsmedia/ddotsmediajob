'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { CATEGORIES, EMIRATES, JOB_TYPES, EXPERIENCE_LEVELS } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/primitives';

type Draft = {
  title: string;
  description: string;
  categorySlug: string;
  emirateSlug: string;
  jobType: string;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
  benefits: string[];
  isRemote: boolean;
  isFresher: boolean;
};

const EMPTY: Draft = {
  title: '',
  description: '',
  categorySlug: 'it',
  emirateSlug: 'dubai',
  jobType: 'full-time',
  experienceLevel: '1-3-years',
  salaryMin: null,
  salaryMax: null,
  skills: [],
  benefits: [],
  isRemote: false,
  isFresher: false,
};

export function PostJobForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const ai = trpc.jobs.aiQuickPost.useMutation({
    onSuccess: (d) => {
      setDraft({ ...EMPTY, ...d });
      toast.success('Draft generated — review and publish');
    },
    onError: (e) => toast.error(e.message),
  });
  const create = trpc.jobs.create.useMutation({
    onSuccess: () => {
      toast.success('Job submitted for review!');
      router.push('/employer/jobs');
    },
    onError: (e) => toast.error(e.message),
  });

  function publish() {
    create.mutate({
      ...draft,
      salaryPeriod: 'monthly',
      salaryHidden: false,
      isUrgent: false,
      visaStatus: 'any',
    } as never);
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="mt-6 space-y-6">
      {/* AI quick post */}
      <div className="rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/40 p-5">
        <Label className="flex items-center gap-2 text-teal-700">
          <Sparkles className="h-4 w-4" /> AI Quick Post
        </Label>
        <Textarea
          className="mt-2 bg-white"
          placeholder="e.g. We need a full-time light vehicle driver in Dubai, 2 years UAE experience, salary 3500 AED, visa provided"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <Button className="mt-3" onClick={() => ai.mutate({ prompt })} disabled={ai.isPending || prompt.trim().length < 10}>
          {ai.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate with AI
        </Button>
      </div>

      {/* Editable form */}
      <div className="space-y-5 rounded-xl border bg-white p-6">
        <Field label="Job title">
          <Input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Senior Accountant" />
        </Field>
        <Field label="Description">
          <Textarea
            className="min-h-[220px]"
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Responsibilities, requirements, benefits…"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <Select value={draft.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Emirate">
            <Select value={draft.emirateSlug} onChange={(e) => set('emirateSlug', e.target.value)}>
              {EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
            </Select>
          </Field>
          <Field label="Job type">
            <Select value={draft.jobType} onChange={(e) => set('jobType', e.target.value)}>
              {JOB_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace('-', ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Experience">
            <Select value={draft.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}>
              {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l.replace(/-/g, ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Salary min (AED/mo)">
            <Input
              type="number"
              value={draft.salaryMin ?? ''}
              onChange={(e) => set('salaryMin', e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="Salary max (AED/mo)">
            <Input
              type="number"
              value={draft.salaryMax ?? ''}
              onChange={(e) => set('salaryMax', e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
        </div>

        <Field label="Skills (comma-separated)">
          <Input
            value={draft.skills.join(', ')}
            onChange={(e) => set('skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </Field>
        <Field label="Benefits (comma-separated)">
          <Input
            value={draft.benefits.join(', ')}
            onChange={(e) => set('benefits', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </Field>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={draft.isRemote} onChange={(e) => set('isRemote', e.target.checked)} className="h-4 w-4 rounded text-teal-600" />
            Remote
          </label>
          <label className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={draft.isFresher} onChange={(e) => set('isFresher', e.target.checked)} className="h-4 w-4 rounded text-teal-600" />
            Fresher friendly
          </label>
        </div>

        <Button size="lg" onClick={publish} disabled={create.isPending || draft.title.length < 3 || draft.description.length < 30}>
          {create.isPending ? <Loader2 className="animate-spin" /> : <Send />} Submit for Review
        </Button>
        <p className="text-xs text-navy-700/50">Jobs are reviewed by our team before going live (usually within a few hours).</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
