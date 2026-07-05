'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft, Trash2, CalendarPlus } from 'lucide-react';
import { CATEGORIES, EMIRATES, JOB_TYPES, APPLICANT_LOCATIONS, APPLICANT_LOCATION_LABEL, formatDateTime } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/primitives';
import { TiptapEditor } from '@/components/tiptap-editor';

const STATUSES = ['active', 'pending', 'rejected', 'closed', 'expired', 'filled', 'draft'] as const;
const FLAGS = [
  ['visaProvided', 'Visa provided'], ['accommodationProvided', 'Accommodation'], ['isFresher', 'Freshers welcome'],
  ['isRemote', 'Remote'], ['isUrgent', 'Urgent'], ['isFeatured', 'Featured'], ['freeZone', 'Free zone'],
  ['isAnonymous', 'Anonymous'], ['salaryHidden', 'Hide salary'], ['showEmployerInfo', 'Show About Employer'],
] as const;

type Form = {
  title: string; description: string; categorySlug: string; emirateSlug: string; location: string;
  jobType: string; salaryMin: string; salaryMax: string; status: string; applicantLocation: string;
  contactWhatsapp: string; applyEmail: string; skills: string; benefits: string;
  visaProvided: boolean; accommodationProvided: boolean; isFresher: boolean; isRemote: boolean;
  isUrgent: boolean; isFeatured: boolean; freeZone: boolean; isAnonymous: boolean; salaryHidden: boolean; showEmployerInfo: boolean;
  walkIn: boolean; walkInDate: string; walkInTimeStart: string; walkInTimeEnd: string; walkInVenue: string; walkInMapsUrl: string;
  walkInLastDate: string; walkInContactPhone: string; walkInRequiredDocs: string;
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
  const del = trpc.admin.deleteJob.useMutation({
    onSuccess: () => { toast.success('Job deleted successfully'); router.push('/admin/jobs'); },
    onError: (e) => toast.error(e.message),
  });
  const extend = trpc.admin.extendJobExpiry.useMutation({
    onSuccess: (r) => { toast.success(r.reactivated ? 'Extended 30 days & reactivated' : 'Expiry extended 30 days'); void job.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    const j = job.data;
    if (!j || f) return;
    setF({
      title: j.title, description: j.description, categorySlug: j.categorySlug, emirateSlug: j.emirateSlug,
      location: j.location ?? '', jobType: j.jobType, salaryMin: j.salaryMin?.toString() ?? '', salaryMax: j.salaryMax?.toString() ?? '',
      status: j.status, applicantLocation: j.applicantLocation ?? 'both', contactWhatsapp: j.contactWhatsapp ?? '', applyEmail: j.applyEmail ?? '',
      skills: (j.skills ?? []).join(', '), benefits: (j.benefits ?? []).join(', '),
      visaProvided: j.visaProvided, accommodationProvided: j.accommodationProvided, isFresher: j.isFresher,
      isRemote: j.isRemote, isUrgent: j.isUrgent, isFeatured: j.isFeatured, freeZone: j.freeZone,
      isAnonymous: j.isAnonymous, salaryHidden: j.salaryHidden, showEmployerInfo: j.showEmployerInfo ?? true,
      walkIn: j.walkIn, walkInDate: j.walkInDate ?? '', walkInTimeStart: j.walkInTimeStart ?? '', walkInTimeEnd: j.walkInTimeEnd ?? '', walkInVenue: j.walkInVenue ?? '', walkInMapsUrl: j.walkInMapsUrl ?? '',
      walkInLastDate: j.walkInLastDate ?? '', walkInContactPhone: j.walkInContactPhone ?? '', walkInRequiredDocs: j.walkInRequiredDocs ?? '',
    });
  }, [job.data, f]);

  if (job.isLoading || !f) return <Loader2 className="m-6 animate-spin text-teal-500" />;

  function save() {
    if (!f) return;
    if (f.walkIn && (!f.walkInDate || !f.walkInTimeStart || !f.walkInTimeEnd || !f.walkInVenue.trim()))
      return toast.error('Walk-in: date, time from/to and venue are required');
    update.mutate({
      id,
      title: f.title, description: f.description, categorySlug: f.categorySlug, emirateSlug: f.emirateSlug,
      location: f.location || undefined, jobType: f.jobType,
      salaryMin: f.salaryMin ? Number(f.salaryMin) : null, salaryMax: f.salaryMax ? Number(f.salaryMax) : null,
      salaryHidden: f.salaryHidden, visaProvided: f.visaProvided, accommodationProvided: f.accommodationProvided,
      isFresher: f.isFresher, isRemote: f.isRemote, isUrgent: f.isUrgent, isFeatured: f.isFeatured,
      freeZone: f.freeZone, isAnonymous: f.isAnonymous, showEmployerInfo: f.showEmployerInfo,
      walkIn: f.walkIn, walkInDate: f.walkInDate || undefined, walkInTimeStart: f.walkInTimeStart || undefined, walkInTimeEnd: f.walkInTimeEnd || undefined, walkInVenue: f.walkInVenue || undefined, walkInMapsUrl: f.walkInMapsUrl || undefined,
      walkInLastDate: f.walkInLastDate || undefined, walkInContactPhone: f.walkInContactPhone || undefined, walkInRequiredDocs: f.walkInRequiredDocs || undefined,
      skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean),
      benefits: f.benefits.split(',').map((s) => s.trim()).filter(Boolean),
      contactWhatsapp: f.contactWhatsapp || undefined, applyEmail: f.applyEmail || undefined,
      applicantLocation: f.applicantLocation as never,
      status: f.status as never,
    });
  }

  return (
    <div className="max-w-3xl">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/jobs"><ArrowLeft /> All Jobs</Link></Button>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy-900">Edit Job</h1>
      <p className="text-sm text-navy-700/60">Admin edits go live immediately — no approval queue.</p>

      {job.data && (
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border bg-navy-50/50 p-5 text-sm sm:grid-cols-3">
          <Info label="Created" value={formatDateTime(job.data.createdAt)} />
          <Info label="Published" value={job.data.publishedAt ? formatDateTime(job.data.publishedAt) : 'Not yet published'} />
          <Info label="Last updated" value={formatDateTime(job.data.updatedAt)} />
          <Info label="Source" value={job.data.source} />
          <Info label="Expires" value={job.data.expiresAt ? formatDateTime(job.data.expiresAt) : 'No expiry'} />
          <Info label="Views" value={String(job.data.viewCount ?? 0)} />
          <Info label="Applications" value={String(job.data.applicationCount ?? 0)} />
        </div>
      )}

      <div className="mt-6 space-y-5 rounded-xl border bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Fld label="Title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} /></Fld>
          <Fld label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}</Select></Fld>
          <Fld label="Category"><Select value={f.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Fld>
          <Fld label="Emirate"><Select value={f.emirateSlug} onChange={(e) => set('emirateSlug', e.target.value)}>{EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</Select></Fld>
          <Fld label="Job type"><Select value={f.jobType} onChange={(e) => set('jobType', e.target.value)}>{JOB_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace('-', ' ')}</option>)}</Select></Fld>
          <Fld label="Area"><Input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Deira" /></Fld>
          <Fld label="Applicant location"><Select value={f.applicantLocation} onChange={(e) => set('applicantLocation', e.target.value)}>{APPLICANT_LOCATIONS.map((l) => <option key={l} value={l}>{APPLICANT_LOCATION_LABEL[l]}</option>)}</Select></Fld>
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
          <label className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={f.walkIn} onChange={(e) => set('walkIn', e.target.checked)} className="h-4 w-4 rounded text-teal-600" /> 🚶 Walk-in interview
          </label>
        </div>

        {f.walkIn && (
          <div className="grid gap-5 rounded-lg border border-teal-200 bg-teal-50/40 p-4 sm:grid-cols-2">
            <div className="text-sm font-semibold text-teal-800 sm:col-span-2">🚶 Walk-in Interview details</div>
            <Fld label="Date"><Input type="date" value={f.walkInDate} onChange={(e) => set('walkInDate', e.target.value)} /></Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Time from"><Input type="time" value={f.walkInTimeStart} onChange={(e) => set('walkInTimeStart', e.target.value)} /></Fld>
              <Fld label="Time to"><Input type="time" value={f.walkInTimeEnd} onChange={(e) => set('walkInTimeEnd', e.target.value)} /></Fld>
            </div>
            <div className="sm:col-span-2"><Fld label="Venue / Address"><Textarea className="min-h-[70px] resize-y" value={f.walkInVenue} onChange={(e) => set('walkInVenue', e.target.value)} placeholder="Building, street, area, emirate" /></Fld></div>
            <div className="sm:col-span-2"><Fld label="Google Maps URL (optional)"><Input value={f.walkInMapsUrl} onChange={(e) => set('walkInMapsUrl', e.target.value)} placeholder="https://maps.google.com/..." /></Fld></div>
            <Fld label="Walk-in open until (optional)"><Input type="date" value={f.walkInLastDate} onChange={(e) => set('walkInLastDate', e.target.value)} /></Fld>
            <Fld label="Contact phone"><Input type="tel" value={f.walkInContactPhone} onChange={(e) => set('walkInContactPhone', e.target.value)} placeholder="+971 XX XXX XXXX" /></Fld>
            <div className="sm:col-span-2"><Fld label="Required documents"><Textarea className="min-h-[60px] resize-y" value={f.walkInRequiredDocs} onChange={(e) => set('walkInRequiredDocs', e.target.value)} placeholder="CV, passport copy, photo, certificates..." /></Fld></div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="accent" onClick={save} disabled={update.isPending}>{update.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save changes</Button>
            <Button variant="outline" onClick={() => extend.mutate({ id, days: 30 })} disabled={extend.isPending} title="Push expiry out 30 days (reactivates if expired)">
              {extend.isPending ? <Loader2 className="animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Extend +30 days
            </Button>
          </div>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => { if (prompt('Type DELETE to permanently remove this job:') === 'DELETE') del.mutate({ id }); }}
            disabled={del.isPending}
          >
            {del.isPending ? <Loader2 className="animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete Job
          </Button>
        </div>
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</p><p className="mt-0.5 capitalize text-navy-800">{value || '—'}</p></div>;
}
