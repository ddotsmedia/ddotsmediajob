'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Send, Save, MessageCircle, Trash2 } from 'lucide-react';
import { CATEGORIES, EMIRATES, JOB_TYPES, formatSalary } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Badge } from '@/components/ui/primitives';
import { TiptapEditor } from '@/components/tiptap-editor';
import { cn } from '@/lib/utils';

export type DraftInit = {
  title?: string; company?: string; emirate?: string; area?: string;
  categorySlug?: string; jobType?: string; salaryMin?: number; salaryMax?: number;
  visaProvided?: boolean; accommodation?: boolean; freshersWelcome?: boolean; remote?: boolean; urgent?: boolean; freeZone?: boolean;
  description?: string; requirements?: string; benefits?: string[]; tags?: string[];
  contactWhatsapp?: string;
  confidence?: Record<string, string>;
};

const blank = {
  title: '', companyName: '', categorySlug: 'admin', emirateSlug: 'dubai', location: '',
  jobType: 'full-time', salaryMin: '', salaryMax: '', salaryHidden: false,
  visaProvided: false, accommodationProvided: false, isFresher: false, isRemote: false, isUrgent: false,
  freeZone: false, isAnonymous: false, isFeatured: false, contactWhatsapp: '', skills: '', benefits: '',
  description: '<p></p>',
};

function Conf({ level }: { level?: string }) {
  if (!level) return null;
  const c = level === 'high' ? 'bg-lime-500' : level === 'medium' ? 'bg-gold-500' : 'bg-accent-500';
  return <span className={cn('ml-1 inline-block h-2 w-2 rounded-full align-middle', c)} title={`AI confidence: ${level}`} />;
}

export function AdminJobReviewForm({ draft, source = 'manual', onReset }: { draft?: DraftInit | null; source?: string; onReset?: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ ...blank });
  const conf = draft?.confidence ?? {};
  const create = trpc.admin.createJob.useMutation();

  useEffect(() => {
    if (!draft) return;
    const desc = (draft.description ?? '') + (draft.requirements ? `\n\nRequirements:\n${draft.requirements}` : '');
    setF({
      ...blank,
      title: draft.title ?? '', companyName: draft.company ?? '',
      categorySlug: draft.categorySlug ?? 'admin', emirateSlug: draft.emirate ?? 'dubai',
      location: draft.area ?? '', jobType: draft.jobType ?? 'full-time',
      salaryMin: draft.salaryMin ? String(draft.salaryMin) : '', salaryMax: draft.salaryMax ? String(draft.salaryMax) : '',
      visaProvided: !!draft.visaProvided, accommodationProvided: !!draft.accommodation,
      isFresher: !!draft.freshersWelcome, isRemote: !!draft.remote, isUrgent: !!draft.urgent, freeZone: !!draft.freeZone,
      isAnonymous: false, isFeatured: false, contactWhatsapp: draft.contactWhatsapp ?? '',
      skills: (draft.tags ?? []).join(', '), benefits: (draft.benefits ?? []).join(', '),
      description: desc.trim() ? `<p>${desc.replace(/\n/g, '<br/>')}</p>` : '<p></p>',
    });
  }, [draft]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  function payload(status: 'active' | 'draft') {
    return {
      title: f.title, description: f.description, companyName: f.companyName || undefined,
      categorySlug: f.categorySlug, emirateSlug: f.emirateSlug, location: f.location || undefined,
      jobType: f.jobType, salaryMin: f.salaryMin ? Number(f.salaryMin) : null, salaryMax: f.salaryMax ? Number(f.salaryMax) : null,
      salaryHidden: f.salaryHidden, visaProvided: f.visaProvided, accommodationProvided: f.accommodationProvided,
      isFresher: f.isFresher, isRemote: f.isRemote, isUrgent: f.isUrgent, isFeatured: f.isFeatured,
      freeZone: f.freeZone, isAnonymous: f.isAnonymous, contactWhatsapp: f.contactWhatsapp || undefined,
      skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean),
      benefits: f.benefits.split(',').map((s) => s.trim()).filter(Boolean),
      status, source: source as never,
    };
  }

  function plain() {
    return f.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function submit(status: 'active' | 'draft', blast = false) {
    if (f.title.trim().length < 3) return toast.error('Title required');
    if (plain().length < 10) return toast.error('Description required');
    if (status === 'active' && !f.salaryHidden && (!f.salaryMin || !f.salaryMax))
      return toast.error('Salary range required to publish (or tick “hide salary”)');
    create.mutate(payload(status) as never, {
      onSuccess: (r: { slug: string }) => {
        if (blast) {
          const url = `https://ddotsmediajobs.com/jobs/${r.slug}`;
          const msg = `📢 ${f.title}\n${f.companyName ? f.companyName + ' · ' : ''}${EMIRATES.find((e) => e.slug === f.emirateSlug)?.name}\n${formatSalary(Number(f.salaryMin) || null, Number(f.salaryMax) || null, 'monthly', f.salaryHidden)}\nApply: ${url}`;
          navigator.clipboard.writeText(msg);
          toast.success('Published + WhatsApp blast copied');
        } else {
          toast.success(status === 'active' ? 'Published live' : 'Saved as draft');
        }
        router.push('/admin/jobs');
      },
      onError: (e: { message: string }) => toast.error(e.message),
    });
  }

  return (
    <div className="mt-6 space-y-5 rounded-xl border bg-white p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={<>Title <Conf level={conf.title} /></>}><Input value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label={<>Company <Conf level={conf.company} /></>}><Input value={f.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="Leave blank for confidential" /></Field>
        <Field label={<>Category <Conf level={conf.category} /></>}><Select value={f.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
        <Field label={<>Job type <Conf level={conf.jobType} /></>}><Select value={f.jobType} onChange={(e) => set('jobType', e.target.value)}>{JOB_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace('-', ' ')}</option>)}</Select></Field>
        <Field label={<>Emirate <Conf level={conf.emirate} /></>}><Select value={f.emirateSlug} onChange={(e) => set('emirateSlug', e.target.value)}>{EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</Select></Field>
        <Field label="Area"><Input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Deira, Business Bay" /></Field>
        <Field label={<>Salary min (AED) <Conf level={conf.salary} /></>}><Input type="number" value={f.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} /></Field>
        <Field label="Salary max (AED)"><Input type="number" value={f.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} /></Field>
        <Field label="WhatsApp contact"><Input value={f.contactWhatsapp} onChange={(e) => set('contactWhatsapp', e.target.value)} placeholder="+9715xxxxxxxx" /></Field>
        <Field label="Skills / tags (comma-separated)"><Input value={f.skills} onChange={(e) => set('skills', e.target.value)} /></Field>
        <Field label="Benefits (comma-separated)"><Input value={f.benefits} onChange={(e) => set('benefits', e.target.value)} /></Field>
      </div>

      <div className="space-y-1.5"><Label>Description</Label><TiptapEditor value={f.description} onChange={(v) => set('description', v)} /></div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {([['visaProvided', 'Visa provided'], ['accommodationProvided', 'Accommodation'], ['isFresher', 'Freshers welcome'], ['isRemote', 'Remote'], ['isUrgent', 'Urgent'], ['freeZone', 'Free zone'], ['isAnonymous', 'Anonymous'], ['isFeatured', 'Featured'], ['salaryHidden', 'Hide salary']] as const).map(([k, lbl]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded text-teal-600" /> {lbl}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="accent" onClick={() => submit('active')} disabled={create.isPending}>{create.isPending ? <Loader2 className="animate-spin" /> : <Send />} Publish Now</Button>
        <Button variant="outline" onClick={() => submit('draft')} disabled={create.isPending}><Save /> Save Draft</Button>
        <Button variant="outline" onClick={() => submit('active', true)} disabled={create.isPending}><MessageCircle /> Publish + WA Blast</Button>
        {onReset && <Button variant="ghost" onClick={onReset}><Trash2 /> Discard</Button>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
