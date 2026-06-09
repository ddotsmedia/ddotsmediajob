'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { CATEGORIES, EMIRATES, JOB_TYPES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/primitives';
import { TiptapEditor } from '@/components/tiptap-editor';

const STATUSES = ['active', 'pending', 'rejected', 'closed', 'expired', 'filled', 'draft'] as const;
const FLAGS = [
  ['visaProvided', 'Visa provided'], ['accommodationProvided', 'Accommodation'], ['isFresher', 'Freshers welcome'],
  ['isRemote', 'Remote'], ['isUrgent', 'Urgent'], ['isFeatured', 'Featured'], ['freeZone', 'Free zone'],
  ['isAnonymous', 'Anonymous'], ['salaryHidden', 'Hide salary'],
] as const;

type Form = {
  title: string; description: string; categorySlug: string; emirateSlug: string; location: string;
  jobType: string; salaryMin: string; salaryMax: string; status: string;
  contactWhatsapp: string; applyEmail: string; skills: string; benefits: string;
  visaProvided: boolean; accommodationProvided: boolean; isFresher: boolean; isRemote: boolean;
  isUrgent: boolean; isFeatured: boolean; freeZone: boolean; isAnonymous: boolean; salaryHidden: boolean;
};

export default function AdminJobEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const job = trpc.admin.jobForEdit.useQuery({ id });
  const [f, setF] = useState<Form | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => (s ? { ...s, [k]: v } : s));

  const update = trpc.admin.updateJob.useMutation({
    onSuccess: () => { toast.success('Job updated — live immediately'); router.push('/admin/jobs'); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    const j = job.data;
    if (!j || f) return;
    setF({
      title: j.title, description: j.description, categorySlug: j.categorySlug, emirateSlug: j.emirateSlug,
      location: j.location ?? '', jobType: j.jobType, salaryMin: j.salaryMin?.toString() ?? '', salaryMax: j.salaryMax?.toString() ?? '',
      status: j.status, contactWhatsapp: j.contactWhatsapp ?? '', applyEmail: j.applyEmail ?? '',
      skills: (j.skills ?? []).join(', '), benefits: (j.benefits ?? []).join(', '),
      visaProvided: j.visaProvided, accommodationProvided: j.accommodationProvided, isFresher: j.isFresher,
      isRemote: j.isRemote, isUrgent: j.isUrgent, isFeatured: j.isFeatured, freeZone: j.freeZone,
      isAnonymous: j.isAnonymous, salaryHidden: j.salaryHidden,
    });
  }, [job.data, f]);

  if (job.isLoading || !f) return <Loader2 className="m-6 animate-spin text-teal-500" />;

  function save() {
    if (!f) return;
    update.mutate({
      id,
      title: f.title, description: f.description, categorySlug: f.categorySlug, emirateSlug: f.emirateSlug,
      location: f.location || undefined, jobType: f.jobType,
      salaryMin: f.salaryMin ? Number(f.salaryMin) : null, salaryMax: f.salaryMax ? Number(f.salaryMax) : null,
      salaryHidden: f.salaryHidden, visaProvided: f.visaProvided, accommodationProvided: f.accommodationProvided,
      isFresher: f.isFresher, isRemote: f.isRemote, isUrgent: f.isUrgent, isFeatured: f.isFeatured,
      freeZone: f.freeZone, isAnonymous: f.isAnonymous,
      skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean),
      benefits: f.benefits.split(',').map((s) => s.trim()).filter(Boolean),
      contactWhatsapp: f.contactWhatsapp || undefined, applyEmail: f.applyEmail || undefined,
      status: f.status as never,
    });
  }

  return (
    <div className="max-w-3xl">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/jobs"><ArrowLeft /> All Jobs</Link></Button>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy-900">Edit Job</h1>
      <p className="text-sm text-navy-700/60">Admin edits go live immediately — no approval queue.</p>

      <div className="mt-6 space-y-5 rounded-xl border bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Fld label="Title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} /></Fld>
          <Fld label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}</Select></Fld>
          <Fld label="Category"><Select value={f.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Fld>
          <Fld label="Emirate"><Select value={f.emirateSlug} onChange={(e) => set('emirateSlug', e.target.value)}>{EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</Select></Fld>
          <Fld label="Job type"><Select value={f.jobType} onChange={(e) => set('jobType', e.target.value)}>{JOB_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace('-', ' ')}</option>)}</Select></Fld>
          <Fld label="Area"><Input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Deira" /></Fld>
          <Fld label="Salary min (AED)"><Input type="number" value={f.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} /></Fld>
          <Fld label="Salary max (AED)"><Input type="number" value={f.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} /></Fld>
          <Fld label="Contact WhatsApp"><Input value={f.contactWhatsapp} onChange={(e) => set('contactWhatsapp', e.target.value)} placeholder="+9715xxxxxxxx" /></Fld>
          <Fld label="Contact Email"><Input type="email" value={f.applyEmail} onChange={(e) => set('applyEmail', e.target.value)} placeholder="hr@company.com" /></Fld>
          <Fld label="Skills (comma-separated)"><Textarea className="min-h-[80px] resize-y" value={f.skills} onChange={(e) => set('skills', e.target.value)} /></Fld>
          <Fld label="Benefits (comma-separated)"><Textarea className="min-h-[80px] resize-y" value={f.benefits} onChange={(e) => set('benefits', e.target.value)} /></Fld>
        </div>

        <div className="space-y-1.5"><Label>Description</Label><TiptapEditor value={f.description} onChange={(v) => set('description', v)} /></div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {FLAGS.map(([k, lbl]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded text-teal-600" /> {lbl}
            </label>
          ))}
        </div>

        <div className="border-t pt-4">
          <Button variant="accent" onClick={save} disabled={update.isPending}>{update.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save changes</Button>
        </div>
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
