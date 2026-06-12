'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { CATEGORIES, EMIRATES, JOB_TYPES, EXPERIENCE_LEVELS, formatExperience } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/primitives';

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const job = trpc.jobs.byId.useQuery({ id });
  const update = trpc.jobs.update.useMutation({
    onSuccess: () => { toast.success('Job updated'); router.push('/employer/jobs'); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (job.data && !form) {
      setForm({
        title: job.data.title, description: job.data.description, categorySlug: job.data.categorySlug,
        emirateSlug: job.data.emirateSlug, jobType: job.data.jobType, experienceLevel: job.data.experienceLevel,
        salaryMin: job.data.salaryMin, salaryMax: job.data.salaryMax,
        skills: (job.data.skills ?? []).join(', '), benefits: (job.data.benefits ?? []).join(', '),
        isRemote: job.data.isRemote, isFresher: job.data.isFresher, isUrgent: job.data.isUrgent,
      });
    }
  }, [job.data, form]);

  if (job.isLoading || !form) return <Loader2 className="animate-spin text-teal-500" />;
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f!, [k]: v }));
  const s = (k: string) => String(form[k] ?? '');

  function save() {
    if (!form) return;
    update.mutate({
      id,
      data: {
        title: s('title'), description: s('description'), categorySlug: s('categorySlug'),
        emirateSlug: s('emirateSlug'), jobType: s('jobType') as never, experienceLevel: s('experienceLevel') as never,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null, salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        skills: s('skills').split(',').map((x) => x.trim()).filter(Boolean),
        benefits: s('benefits').split(',').map((x) => x.trim()).filter(Boolean),
        isRemote: Boolean(form.isRemote), isFresher: Boolean(form.isFresher), isUrgent: Boolean(form.isUrgent),
      } as never,
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/employer/jobs" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy-900">Edit Job</h1>

      <div className="mt-6 space-y-5 rounded-xl border bg-white p-6">
        <Field label="Title"><Input value={s('title')} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Description"><Textarea className="min-h-[200px]" value={s('description')} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category"><Select value={s('categorySlug')} onChange={(e) => set('categorySlug', e.target.value)}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
          <Field label="Emirate"><Select value={s('emirateSlug')} onChange={(e) => set('emirateSlug', e.target.value)}>{EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</Select></Field>
          <Field label="Job type"><Select value={s('jobType')} onChange={(e) => set('jobType', e.target.value)}>{JOB_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace('-', ' ')}</option>)}</Select></Field>
          <Field label="Experience"><Select value={s('experienceLevel')} onChange={(e) => set('experienceLevel', e.target.value)}>{EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{formatExperience(l)}</option>)}</Select></Field>
          <Field label="Salary min"><Input type="number" value={String(form.salaryMin ?? '')} onChange={(e) => set('salaryMin', e.target.value)} /></Field>
          <Field label="Salary max"><Input type="number" value={String(form.salaryMax ?? '')} onChange={(e) => set('salaryMax', e.target.value)} /></Field>
        </div>
        <Field label="Skills (comma-separated)"><Input value={s('skills')} onChange={(e) => set('skills', e.target.value)} /></Field>
        <Field label="Benefits (comma-separated)"><Input value={s('benefits')} onChange={(e) => set('benefits', e.target.value)} /></Field>
        <div className="flex flex-wrap gap-6">
          {([['isRemote', 'Remote'], ['isFresher', 'Fresher'], ['isUrgent', 'Urgent']] as const).map(([k, lbl]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={Boolean(form[k])} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded text-teal-600" /> {lbl}
            </label>
          ))}
        </div>
        <Button onClick={save} disabled={update.isPending}>{update.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save changes</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
