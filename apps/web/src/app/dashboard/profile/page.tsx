'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, X, ChevronLeft, ChevronRight, Check, FileText, ExternalLink } from 'lucide-react';
import '@uploadthing/react/styles.css';
import { CATEGORIES, EMIRATES, EXPERIENCE_LEVELS, VISA_STATUS } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/primitives';
import { AvatarUpload } from '@/components/avatar-upload';
import { UploadButton } from '@/lib/uploadthing-client';

type Work = { title: string; company: string; from: string; to: string; current: boolean; description: string };
type Edu = { degree: string; institution: string; year: string };
type Form = {
  headline: string; bio: string; nationality: string; emirateSlug: string; categorySlug: string;
  experienceLevel: string; visaStatus: string; availabilityStatus: string;
  expectedSalaryMin: string; expectedSalaryMax: string;
  skills: string[]; languages: string[]; workExperience: Work[]; education: Edu[];
};

const STEPS = ['Basic info', 'Work experience', 'Education & skills', 'Job preferences', 'CV & visibility'];
const emptyWork: Work = { title: '', company: '', from: '', to: '', current: false, description: '' };
const emptyEdu: Edu = { degree: '', institution: '', year: '' };

export default function ProfilePage() {
  const utils = trpc.useUtils();
  const profile = trpc.jobseekers.me.useQuery();
  const save = trpc.jobseekers.updateProfile.useMutation({
    onSuccess: () => { toast.success('Profile saved'); utils.jobseekers.me.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const parseCv = trpc.cvs.parseCv.useMutation();
  // On a new CV, extract its metadata (skills/experience/…) for employer search, with a loader.
  async function onCvUploaded() {
    toast.success('CV uploaded successfully!');
    utils.jobseekers.me.invalidate();
    try { await parseCv.mutateAsync(); } catch { /* best-effort; makeSearchable re-parses later */ }
  }
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => (s ? { ...s, [k]: v } : s));

  useEffect(() => {
    // Init the form once the query settles — even if the row is missing (brand-new user), fall back to
    // empty defaults so the page never spins forever waiting on a null profile.
    if (f || profile.isLoading) return;
    const p = profile.data;
    setF({
      headline: p?.headline ?? '', bio: p?.bio ?? '', nationality: p?.nationality ?? '', emirateSlug: p?.emirateSlug ?? '',
      categorySlug: p?.categorySlug ?? '', experienceLevel: p?.experienceLevel ?? '', visaStatus: p?.visaStatus ?? '',
      availabilityStatus: p?.availabilityStatus ?? 'actively_looking',
      expectedSalaryMin: p?.expectedSalaryMin ? String(p.expectedSalaryMin) : '', expectedSalaryMax: p?.expectedSalaryMax ? String(p.expectedSalaryMax) : '',
      skills: p?.skills ?? [], languages: p?.languages ?? [],
      workExperience: (p?.workExperience ?? []).map((w) => ({ title: w.title, company: w.company, from: w.from ?? '', to: w.to ?? '', current: w.current ?? false, description: w.description ?? '' })),
      education: (p?.education ?? []).map((e) => ({ degree: e.degree, institution: e.institution, year: e.year ?? '' })),
    });
  }, [profile.data, profile.isLoading, f]);

  const pct = useMemo(() => {
    if (!f) return 0;
    const checks = [
      !!f.headline, !!f.bio, !!f.nationality, !!f.emirateSlug, !!f.categorySlug, !!f.experienceLevel,
      f.skills.length > 0, f.workExperience.length > 0, f.education.length > 0, f.languages.length > 0,
      !!profile.data?.resumeUrl, !!(f.expectedSalaryMin || f.expectedSalaryMax),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [f, profile.data?.resumeUrl]);

  if (profile.isLoading || !f) return <Loader2 className="animate-spin text-teal-500" />;

  function persist() {
    if (!f) return;
    save.mutate({
      headline: f.headline || undefined, bio: f.bio || undefined, nationality: f.nationality || undefined,
      emirateSlug: (f.emirateSlug || undefined) as never, categorySlug: (f.categorySlug || undefined) as never,
      experienceLevel: (f.experienceLevel || undefined) as never, visaStatus: (f.visaStatus || undefined) as never,
      availabilityStatus: (f.availabilityStatus || undefined) as never,
      expectedSalaryMin: f.expectedSalaryMin ? Number(f.expectedSalaryMin) : null,
      expectedSalaryMax: f.expectedSalaryMax ? Number(f.expectedSalaryMax) : null,
      skills: f.skills, languages: f.languages,
      workExperience: f.workExperience.filter((w) => w.title && w.company),
      education: f.education.filter((e) => e.degree && e.institution),
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-navy-900">My Profile</h1>

      {/* Completion banner + progress */}
      <div className="mt-4 rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-navy-900">Your profile is {pct}% complete</span>
          <span className="text-navy-700/60">{pct === 100 ? 'All done 🎉' : 'Fill every step to stand out'}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-navy-100">
          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Step tabs */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${step === i ? 'bg-teal-600 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50'}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-5 rounded-xl border bg-white p-6">
        {step === 0 && (
          <>
            <AvatarUpload />
            <Fld label="Headline"><Input value={f.headline} onChange={(e) => set('headline', e.target.value)} placeholder="e.g. Senior Accountant · 6 years" /></Fld>
            <Fld label="Summary"><Textarea value={f.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Tell employers about yourself…" /></Fld>
            <div className="grid gap-5 sm:grid-cols-2">
              <Fld label="Nationality"><Input value={f.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="e.g. Indian" /></Fld>
              <Fld label="Current location">
                <Select value={f.emirateSlug} onChange={(e) => set('emirateSlug', e.target.value)}>
                  <option value="">Select emirate</option>
                  {EMIRATES.map((em) => <option key={em.slug} value={em.slug}>{em.name}</option>)}
                </Select>
              </Fld>
            </div>
          </>
        )}

        {step === 1 && (
          <Repeater title="Work experience" items={f.workExperience} onAdd={() => set('workExperience', [...f.workExperience, { ...emptyWork }])} onRemove={(i) => set('workExperience', f.workExperience.filter((_, x) => x !== i))} render={(w, i) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={w.title} onChange={(e) => set('workExperience', f.workExperience.map((x, k) => k === i ? { ...x, title: e.target.value } : x))} placeholder="Job title" />
                <Input value={w.company} onChange={(e) => set('workExperience', f.workExperience.map((x, k) => k === i ? { ...x, company: e.target.value } : x))} placeholder="Company" />
                <Input value={w.from} onChange={(e) => set('workExperience', f.workExperience.map((x, k) => k === i ? { ...x, from: e.target.value } : x))} placeholder="From (e.g. Jan 2022)" />
                <Input value={w.to} disabled={w.current} onChange={(e) => set('workExperience', f.workExperience.map((x, k) => k === i ? { ...x, to: e.target.value } : x))} placeholder="To (e.g. Dec 2024)" />
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm text-navy-700"><input type="checkbox" checked={w.current} onChange={(e) => set('workExperience', f.workExperience.map((x, k) => k === i ? { ...x, current: e.target.checked, to: e.target.checked ? '' : x.to } : x))} className="h-4 w-4 rounded text-teal-600" /> I currently work here</label>
              <Textarea className="mt-2 min-h-[60px]" value={w.description} onChange={(e) => set('workExperience', f.workExperience.map((x, k) => k === i ? { ...x, description: e.target.value } : x))} placeholder="What you did (optional)" />
            </>
          )} />
        )}

        {step === 2 && (
          <>
            <Repeater title="Education" items={f.education} onAdd={() => set('education', [...f.education, { ...emptyEdu }])} onRemove={(i) => set('education', f.education.filter((_, x) => x !== i))} render={(ed, i) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <Input value={ed.degree} onChange={(e) => set('education', f.education.map((x, k) => k === i ? { ...x, degree: e.target.value } : x))} placeholder="Degree" />
                <Input value={ed.institution} onChange={(e) => set('education', f.education.map((x, k) => k === i ? { ...x, institution: e.target.value } : x))} placeholder="Institution" />
                <Input value={ed.year} onChange={(e) => set('education', f.education.map((x, k) => k === i ? { ...x, year: e.target.value } : x))} placeholder="Year" />
              </div>
            )} />
            <TagInput label="Skills" value={f.skills} onChange={(v) => set('skills', v)} placeholder="Type a skill and press Enter" />
            <TagInput label="Languages" value={f.languages} onChange={(v) => set('languages', v)} placeholder="e.g. English, Arabic, Hindi" />
          </>
        )}

        {step === 3 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Fld label="Field / Category">
              <Select value={f.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}><option value="">Select</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select>
            </Fld>
            <Fld label="Experience level">
              <Select value={f.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}><option value="">Select</option>{EXPERIENCE_LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l.replace(/-/g, ' ')}</option>)}</Select>
            </Fld>
            <Fld label="Visa status">
              <Select value={f.visaStatus} onChange={(e) => set('visaStatus', e.target.value)}><option value="">Select</option>{VISA_STATUS.map((v) => <option key={v} value={v} className="capitalize">{v.replace(/-/g, ' ')}</option>)}</Select>
            </Fld>
            <Fld label="Availability">
              <Select value={f.availabilityStatus} onChange={(e) => set('availabilityStatus', e.target.value)}>
                <option value="actively_looking">Actively looking</option><option value="open_to_work">Open to work</option><option value="not_looking">Not looking</option>
              </Select>
            </Fld>
            <Fld label="Expected salary min (AED)"><Input type="number" value={f.expectedSalaryMin} onChange={(e) => set('expectedSalaryMin', e.target.value)} /></Fld>
            <Fld label="Expected salary max (AED)"><Input type="number" value={f.expectedSalaryMax} onChange={(e) => set('expectedSalaryMax', e.target.value)} /></Fld>
          </div>
        )}

        {step === 4 && (
          <>
            <div className="rounded-xl border bg-white p-5">
              <h2 className="flex items-center gap-2 font-display font-bold text-navy-900"><FileText className="h-4 w-4 text-teal-500" /> Your CV</h2>
              <p className="mt-1 text-sm text-navy-700/60">Upload your CV (PDF or Word, max 4 MB). Employers see it when you apply.</p>
              {profile.data?.resumeUrl && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-navy-50/40 px-4 py-3">
                  <FileText className="h-7 w-7 shrink-0 text-teal-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{profile.data.resumeFilename ?? 'My CV'}</p>
                    {profile.data.resumeUploadedAt && <p className="text-xs text-navy-700/50">Uploaded {new Date(profile.data.resumeUploadedAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  </div>
                  <a href={profile.data.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-white"><ExternalLink className="h-3.5 w-3.5" /> View CV</a>
                </div>
              )}
              <div className="mt-4">
                {parseCv.isPending ? (
                  <p className="flex items-center gap-2 text-sm font-medium text-teal-700"><Loader2 className="h-4 w-4 animate-spin" /> Parsing CV…</p>
                ) : (
                  <UploadButton
                    endpoint="cvUploader"
                    onClientUploadComplete={onCvUploaded}
                    onUploadError={(error) => { toast.error(error.message); }}
                  />
                )}
              </div>
            </div>
            <VisibilityToggles />
          </>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ChevronLeft className="h-4 w-4" /> Back</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={persist} disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next <ChevronRight className="h-4 w-4" /></Button>
            ) : (
              <Button onClick={persist} disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Finish</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Repeater<T>({ title, items, onAdd, onRemove, render }: { title: string; items: T[]; onAdd: () => void; onRemove: (i: number) => void; render: (item: T, i: number) => React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><Label>{title}</Label><Button size="sm" variant="outline" onClick={onAdd}><Plus className="h-4 w-4" /> Add</Button></div>
      {items.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-navy-700/50">Nothing added yet.</p>}
      {items.map((item, i) => (
        <div key={i} className="relative rounded-lg border bg-navy-50/30 p-4">
          <button onClick={() => onRemove(i)} className="absolute right-2 top-2 rounded p-1 text-navy-400 hover:bg-white hover:text-red-500" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
          {render(item, i)}
        </div>
      ))}
    </div>
  );
}

function TagInput({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => { const t = draft.trim().replace(/,$/, ''); if (t && !value.includes(t)) onChange([...value, t]); setDraft(''); };
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-navy-200 p-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">{t}<button onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}><X className="h-3 w-3" /></button></span>
        ))}
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={add} placeholder={placeholder} className="min-w-[140px] flex-1 bg-transparent px-1 text-sm outline-none" />
      </div>
    </div>
  );
}

function VisibilityToggles() {
  const utils = trpc.useUtils();
  const me = trpc.jobseekers.me.useQuery();
  const cvStatus = trpc.cvs.myStatus.useQuery();
  const vis = trpc.jobseekers.toggleVisibility.useMutation({ onSuccess: () => utils.jobseekers.me.invalidate() });
  const otw = trpc.jobseekers.toggleOpenToWork.useMutation({ onSuccess: () => utils.jobseekers.me.invalidate() });
  const cvSearch = trpc.cvs.makeSearchable.useMutation({
    onSuccess: () => { utils.cvs.myStatus.invalidate(); toast.success('CV search preference saved'); },
    onError: (e) => toast.error(e.message),
  });
  const visible = me.data?.visibility !== 'hidden';
  const open = me.data?.openToWork ?? true;
  const searchable = cvStatus.data?.cvSearchable ?? false;
  return (
    <div className="space-y-2 rounded-lg border bg-navy-50/30 p-4">
      <label className="flex items-center justify-between text-sm text-navy-800">Profile visible to employers
        <input type="checkbox" checked={visible} onChange={() => vis.mutate()} className="h-4 w-4 rounded text-teal-600" />
      </label>
      <label className="flex items-center justify-between text-sm text-navy-800">Open to work
        <input type="checkbox" checked={open} onChange={() => otw.mutate()} className="h-4 w-4 rounded text-teal-600" />
      </label>
      <label className="flex items-center justify-between text-sm text-navy-800">CV searchable by employers
        <input type="checkbox" checked={searchable} disabled={cvSearch.isPending} onChange={() => cvSearch.mutate({ cvSearchable: !searchable })} className="h-4 w-4 rounded text-teal-600" />
      </label>
    </div>
  );
}
