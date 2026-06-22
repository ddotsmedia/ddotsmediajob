'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Send, Save, MessageCircle, Trash2, Sparkles, Languages, WandSparkles, TrendingUp } from 'lucide-react';
import { CATEGORIES, EMIRATES, JOB_TYPES, formatSalary } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Badge, Textarea } from '@/components/ui/primitives';
import { TiptapEditor } from '@/components/tiptap-editor';
import { cn } from '@/lib/utils';

export type DraftInit = {
  title?: string; company?: string; emirate?: string; area?: string;
  categorySlug?: string; jobType?: string; salaryMin?: number; salaryMax?: number;
  visaProvided?: boolean; accommodation?: boolean; freshersWelcome?: boolean; remote?: boolean; urgent?: boolean; freeZone?: boolean;
  description?: string; requirements?: string; benefits?: string[]; tags?: string[];
  contactWhatsapp?: string; contactEmail?: string;
  confidence?: Record<string, string>;
};

const blank = {
  title: '', companyName: '', categorySlug: 'admin', emirateSlug: '', location: '',
  jobType: 'full-time', salaryMin: '', salaryMax: '', salaryHidden: false, salaryNegotiable: false,
  visaProvided: false, accommodationProvided: false, isFresher: false, isRemote: false, isUrgent: false,
  freeZone: false, isAnonymous: false, isFeatured: false, contactWhatsapp: '', applyEmail: '', skills: '', benefits: '',
  walkIn: false, walkInDate: '', walkInTimeStart: '', walkInTimeEnd: '', walkInVenue: '', walkInMapsUrl: '',
  walkInLastDate: '', walkInContactPhone: '', walkInRequiredDocs: '',
  description: '<p></p>',
  titleAr: '', descriptionAr: '', requirementsAr: '', benefitsAr: [] as string[],
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
  const [perf, setPerf] = useState<{ estApplies7days: string; estViews7days: string; timeToFirstApply: string; salaryWarning: string | null } | null>(null);

  // Walk-in AI extract
  const [waModal, setWaModal] = useState(false);
  const [waText, setWaText] = useState('');
  const [waStatus, setWaStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const extractWalkin = trpc.ai.extractWalkin.useMutation({
    onSuccess: (d) => {
      if (!d) { setWaStatus('fail'); return; }
      setF((s) => ({
        ...s, walkIn: true,
        title: d.title || s.title,
        companyName: d.company || s.companyName,
        location: d.location || s.location,
        walkInDate: d.walkin_date || s.walkInDate,
        walkInTimeStart: d.walkin_time_start ?? s.walkInTimeStart,
        walkInTimeEnd: d.walkin_time_end ?? s.walkInTimeEnd,
        walkInLastDate: d.walkin_last_date || s.walkInLastDate,
        walkInVenue: d.venue || d.location || s.walkInVenue,
        walkInContactPhone: d.contact_phone || s.walkInContactPhone,
        walkInRequiredDocs: d.required_docs || s.walkInRequiredDocs,
        description: d.description ? `<p>${d.description}</p>` : s.description,
      }));
      setWaStatus('ok');
      setWaModal(false);
      toast.success('Walk-in details extracted');
    },
    onError: () => { setWaStatus('fail'); toast.error('Extraction failed — try again'); },
  });

  const suggestTitle = trpc.ai.autoCompleteJobTitle.useMutation({
    onSuccess: (d) => { if (d.suggestion) set('title', d.suggestion); toast.success('Title suggested'); },
    onError: (e) => toast.error(e.message),
  });
  const continueDesc = trpc.ai.continueJobDescription.useMutation({
    onSuccess: (d) => { set('description', `${f.description}<p>${d.continuation.replace(/\n+/g, '</p><p>')}</p>`); toast.success('Description extended'); },
    onError: (e) => toast.error(e.message),
  });
  const translate = trpc.ai.translateJobToArabic.useMutation({
    onSuccess: (d) => {
      setF((s) => ({ ...s, titleAr: d.titleAr, descriptionAr: d.descriptionAr, requirementsAr: d.requirementsAr ?? '', benefitsAr: d.benefitsAr }));
      toast.success('Translated to Arabic');
    },
    onError: (e) => toast.error(e.message),
  });
  const predict = trpc.ai.predictJobPerformance.useMutation({
    onSuccess: (d) => setPerf(d),
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!draft) return;
    const desc = (draft.description ?? '') + (draft.requirements ? `\n\nRequirements:\n${draft.requirements}` : '');
    setF({
      ...blank,
      title: draft.title ?? '', companyName: draft.company ?? '',
      categorySlug: draft.categorySlug ?? 'admin', emirateSlug: draft.emirate ?? '',
      location: draft.area ?? '', jobType: draft.jobType ?? 'full-time',
      salaryMin: draft.salaryMin ? String(draft.salaryMin) : '', salaryMax: draft.salaryMax ? String(draft.salaryMax) : '',
      visaProvided: !!draft.visaProvided, accommodationProvided: !!draft.accommodation,
      isFresher: !!draft.freshersWelcome, isRemote: !!draft.remote, isUrgent: !!draft.urgent, freeZone: !!draft.freeZone,
      isAnonymous: false, isFeatured: false, contactWhatsapp: draft.contactWhatsapp ?? '', applyEmail: draft.contactEmail ?? '',
      skills: (draft.tags ?? []).join(', '), benefits: (draft.benefits ?? []).join(', '),
      description: desc.trim() ? `<p>${desc.replace(/\n/g, '<br/>')}</p>` : '<p></p>',
    });
  }, [draft]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  function payload(status: 'active' | 'draft') {
    return {
      title: f.title, description: f.description, companyName: f.companyName || undefined,
      categorySlug: f.categorySlug, emirateSlug: f.emirateSlug, location: f.location || undefined,
      jobType: f.jobType, salaryMin: f.salaryNegotiable ? null : f.salaryMin ? Number(f.salaryMin) : null, salaryMax: f.salaryNegotiable ? null : f.salaryMax ? Number(f.salaryMax) : null,
      salaryHidden: !f.salaryNegotiable && (f.salaryHidden || (!f.salaryMin && !f.salaryMax)), salaryNegotiable: f.salaryNegotiable, visaProvided: f.visaProvided, accommodationProvided: f.accommodationProvided,
      isFresher: f.isFresher, isRemote: f.isRemote, isUrgent: f.isUrgent, isFeatured: f.isFeatured,
      freeZone: f.freeZone, isAnonymous: f.isAnonymous, contactWhatsapp: f.contactWhatsapp || undefined, applyEmail: f.applyEmail || undefined,
      walkIn: f.walkIn, walkInDate: f.walkInDate || undefined, walkInTimeStart: f.walkInTimeStart || undefined, walkInTimeEnd: f.walkInTimeEnd || undefined, walkInVenue: f.walkInVenue || undefined, walkInMapsUrl: f.walkInMapsUrl || undefined,
      walkInLastDate: f.walkInLastDate || undefined, walkInContactPhone: f.walkInContactPhone || undefined, walkInRequiredDocs: f.walkInRequiredDocs || undefined,
      skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean),
      benefits: f.benefits.split(',').map((s) => s.trim()).filter(Boolean),
      titleAr: f.titleAr || undefined, descriptionAr: f.descriptionAr || undefined,
      requirementsAr: f.requirementsAr || undefined, benefitsAr: f.benefitsAr.length ? f.benefitsAr : undefined,
      status, source: source as never,
    };
  }

  function plain() {
    return f.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function submit(status: 'active' | 'draft', blast = false) {
    if (f.title.trim().length < 3) return toast.error('Title required');
    if (plain().length < 10) return toast.error('Description required');
    if (f.walkIn && (!f.walkInDate || !f.walkInTimeStart || !f.walkInTimeEnd || !f.walkInVenue.trim()))
      return toast.error('Walk-in: date, time from/to and venue are required');
    create.mutate(payload(status) as never, {
      onSuccess: (r: { slug: string }) => {
        if (blast) {
          const url = `https://ddotsmediajobs.com/jobs/${r.slug}`;
          const msg = `📢 ${f.title}\n${f.companyName ? f.companyName + ' · ' : ''}${EMIRATES.find((e) => e.slug === f.emirateSlug)?.name}\n${formatSalary(Number(f.salaryMin) || null, Number(f.salaryMax) || null, 'monthly', f.salaryHidden, f.salaryNegotiable)}\nApply: ${url}`;
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
        <Field label={<>Emirate <Conf level={conf.emirate} /></>}><Select value={f.emirateSlug} onChange={(e) => set('emirateSlug', e.target.value)}><option value="">Select emirate</option>{EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</Select></Field>
        <Field label="Area"><Input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Deira, Business Bay" /></Field>
        <Field label={<>Salary min (AED) <Conf level={conf.salary} /></>}><Input type="number" value={f.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} /></Field>
        <Field label="Salary max (AED)"><Input type="number" value={f.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} /></Field>
        <Field label="WhatsApp contact"><Input value={f.contactWhatsapp} onChange={(e) => set('contactWhatsapp', e.target.value)} placeholder="+9715xxxxxxxx" /></Field>
        <Field label="Contact Email"><Input type="email" value={f.applyEmail} onChange={(e) => set('applyEmail', e.target.value)} placeholder="hr@company.com" /></Field>
        <Field label="Skills / tags (comma-separated)"><Textarea className="min-h-[80px] resize-y" value={f.skills} onChange={(e) => set('skills', e.target.value)} /></Field>
        <Field label="Benefits (comma-separated)"><Textarea className="min-h-[80px] resize-y" value={f.benefits} onChange={(e) => set('benefits', e.target.value)} /></Field>
      </div>

      <div className="space-y-1.5"><Label>Description</Label><TiptapEditor value={f.description} onChange={(v) => set('description', v)} /></div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {([['visaProvided', 'Visa provided'], ['accommodationProvided', 'Accommodation'], ['isFresher', 'Freshers welcome'], ['isRemote', 'Remote'], ['isUrgent', 'Urgent'], ['freeZone', 'Free zone'], ['isAnonymous', 'Anonymous'], ['isFeatured', 'Featured'], ['salaryHidden', 'Hide salary'], ['salaryNegotiable', 'Negotiable'], ['walkIn', '🚶 Walk-in interview']] as const).map(([k, lbl]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded text-teal-600" /> {lbl}
          </label>
        ))}
      </div>

      {f.walkIn && (
        <div className="grid gap-5 rounded-lg border border-teal-200 bg-teal-50/40 p-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <span className="text-sm font-semibold text-teal-800">🚶 Walk-in Interview details</span>
            <span className="flex items-center gap-2">
              {waStatus === 'ok' && <span className="text-xs font-semibold text-green-600">✓ Extracted</span>}
              {waStatus === 'fail' && <span className="text-xs font-semibold text-red-600">✗ Try again</span>}
              <Button type="button" variant="outline" size="sm" onClick={() => { setWaStatus('idle'); setWaModal(true); }}>🪄 Extract from WhatsApp message</Button>
            </span>
          </div>
          <Field label="Date"><Input type="date" value={f.walkInDate} onChange={(e) => set('walkInDate', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time from"><Input type="time" value={f.walkInTimeStart} onChange={(e) => set('walkInTimeStart', e.target.value)} /></Field>
            <Field label="Time to"><Input type="time" value={f.walkInTimeEnd} onChange={(e) => set('walkInTimeEnd', e.target.value)} /></Field>
          </div>
          <Field label="Venue / Address" className="sm:col-span-2"><Textarea className="min-h-[70px] resize-y" value={f.walkInVenue} onChange={(e) => set('walkInVenue', e.target.value)} placeholder="Building, street, area, emirate" /></Field>
          <Field label="Google Maps URL (optional)" className="sm:col-span-2"><Input value={f.walkInMapsUrl} onChange={(e) => set('walkInMapsUrl', e.target.value)} placeholder="https://maps.google.com/..." /></Field>
          <Field label="Walk-in open until (optional)"><Input type="date" value={f.walkInLastDate} onChange={(e) => set('walkInLastDate', e.target.value)} /></Field>
          <Field label="Contact phone"><Input type="tel" value={f.walkInContactPhone} onChange={(e) => set('walkInContactPhone', e.target.value)} placeholder="+971 XX XXX XXXX" /></Field>
          <Field label="Required documents" className="sm:col-span-2"><Textarea className="min-h-[60px] resize-y" value={f.walkInRequiredDocs} onChange={(e) => set('walkInRequiredDocs', e.target.value)} placeholder="CV, passport copy, photo, certificates..." /></Field>
        </div>
      )}

      {waModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setWaModal(false)} />
          <div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <p className="font-display text-base font-bold text-navy-900">🪄 Extract walk-in details</p>
            <p className="mt-1 text-sm text-navy-700/60">Paste the walk-in announcement text here.</p>
            <Textarea className="mt-3 min-h-[180px] resize-y" value={waText} onChange={(e) => setWaText(e.target.value)} placeholder="Walk-in interview for Sales Executives…" />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setWaModal(false)}>Cancel</Button>
              <Button size="sm" disabled={extractWalkin.isPending || waText.trim().length < 15} onClick={() => extractWalkin.mutate({ text: waText.trim() })}>
                {extractWalkin.isPending ? <Loader2 className="animate-spin" /> : <WandSparkles />} Extract
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-teal-100 bg-teal-50/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-800"><Sparkles className="h-4 w-4" /> AI assist</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={suggestTitle.isPending || f.title.trim().length < 3} onClick={() => suggestTitle.mutate({ partial: f.title.trim() })}>
            {suggestTitle.isPending ? <Loader2 className="animate-spin" /> : <WandSparkles />} Suggest title
          </Button>
          <Button variant="outline" size="sm" disabled={continueDesc.isPending || plain().length < 50} onClick={() => continueDesc.mutate({ existing: plain(), style: 'professional' })}>
            {continueDesc.isPending ? <Loader2 className="animate-spin" /> : <WandSparkles />} Continue description
          </Button>
          <Button variant="outline" size="sm" disabled={translate.isPending || f.title.trim().length < 3 || plain().length < 10} onClick={() => translate.mutate({ title: f.title, description: plain(), requirements: undefined, benefits: f.benefits.split(',').map((s) => s.trim()).filter(Boolean) })}>
            {translate.isPending ? <Loader2 className="animate-spin" /> : <Languages />} Translate to Arabic
          </Button>
          <Button variant="outline" size="sm" disabled={predict.isPending} onClick={() => predict.mutate({ categorySlug: f.categorySlug, emirateSlug: f.emirateSlug, salaryMin: f.salaryMin ? Number(f.salaryMin) : undefined, featured: f.isFeatured, urgent: f.isUrgent, waBlast: false })}>
            {predict.isPending ? <Loader2 className="animate-spin" /> : <TrendingUp />} Predict performance
          </Button>
        </div>
        {perf && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge>~{perf.estApplies7days} applies / 7d</Badge>
            <Badge>~{perf.estViews7days} views / 7d</Badge>
            <Badge>1st apply {perf.timeToFirstApply}</Badge>
            {perf.salaryWarning && <Badge className="bg-accent-100 text-accent-700">{perf.salaryWarning}</Badge>}
          </div>
        )}
        {f.titleAr && (
          <div dir="rtl" className="space-y-1 rounded-md border bg-white p-3 text-right text-sm">
            <p className="font-semibold text-navy-800">{f.titleAr}</p>
            <p className="whitespace-pre-wrap text-navy-600">{f.descriptionAr}</p>
            {f.benefitsAr.length > 0 && <p className="text-xs text-navy-500">{f.benefitsAr.join(' · ')}</p>}
            <button type="button" dir="ltr" onClick={() => setF((s) => ({ ...s, titleAr: '', descriptionAr: '', requirementsAr: '', benefitsAr: [] }))} className="text-xs text-accent-600 hover:underline">Clear Arabic</button>
          </div>
        )}
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

function Field({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}><Label>{label}</Label>{children}</div>;
}
