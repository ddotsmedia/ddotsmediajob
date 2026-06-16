'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Send, Trash2, Pencil, X } from 'lucide-react';
import { formatRelative, CATEGORIES, EMIRATES, JOB_TYPES, EXPERIENCE_LEVELS, formatExperience } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Select, Badge, Input, Label, Textarea } from '@/components/ui/primitives';
import { SourceBadge } from '@/components/source-badge';

const SOURCES = ['paste', 'whatsapp', 'whapi', 'telegram', 'csv', 'quick', 'url', 'manual'];

type SenderMeta = { from?: string; fromName?: string | null; chatId?: string | null; chatName?: string | null; receivedAt?: string | null };

type Draft = {
  id: string; title: string; description: string; categorySlug: string; emirateSlug: string; jobType: string;
  experienceLevel: string | null; salaryMin: number | null; salaryMax: number | null; contactWhatsapp: string | null;
  applyEmail: string | null; visaProvided: boolean; accommodationProvided: boolean; isUrgent: boolean; isFresher: boolean;
  source: string; sourceMetadata?: SenderMeta | null;
  company?: { name: string | null } | null;
};

/** Digits only — for wa.me links. */
function waDigits(raw?: string | null): string {
  return (raw ?? '').replace(/\D/g, '');
}

/** Pretty UAE phone: +971 50 123 4567 (falls back to +<digits>). */
function formatPhone(raw?: string | null): string | null {
  const d = waDigits(raw);
  if (!d) return null;
  if (d.startsWith('971') && d.length === 12) {
    const n = d.slice(3);
    return `+971 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
  }
  return `+${d}`;
}

function SenderCell({ meta }: { meta?: SenderMeta | null }) {
  const phone = formatPhone(meta?.from);
  if (!phone) return <span className="text-navy-700/40">—</span>;
  return (
    <div className="leading-tight">
      {meta?.fromName && <span className="block text-xs text-navy-700/50">{meta.fromName}</span>}
      <a href={`https://wa.me/${waDigits(meta?.from)}`} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 hover:underline">
        {phone}
      </a>
    </div>
  );
}

export default function DraftsPage() {
  const utils = trpc.useUtils();
  const [source, setSource] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const drafts = trpc.admin.draftJobs.useQuery(source ? { source } : undefined);
  const inval = () => utils.admin.draftJobs.invalidate();
  const publish = trpc.admin.publishDraft.useMutation({ onSuccess: () => { inval(); toast.success('Published live'); } });
  const del = trpc.admin.deleteJob.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Job Drafts</h1>
        <Button asChild><Link href="/admin/jobs/add">Add Job</Link></Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Select className="w-44" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </Select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        {drafts.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Sender</th><th className="px-4 py-3">Created</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>
              {drafts.data?.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{d.title}<span className="block text-xs font-normal text-navy-700/50">{d.company?.name ?? 'Direct Employer'}</span></td>
                  <td className="px-4 py-3"><SourceBadge source={d.source} /></td>
                  <td className="px-4 py-3"><SenderCell meta={d.sourceMetadata as SenderMeta | null} /></td>
                  <td className="px-4 py-3 text-navy-700/50">Created {formatRelative(d.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" onClick={() => setEditing(d as Draft)}><Pencil /> Review &amp; Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => publish.mutate({ id: d.id })}><Send /> Publish</Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: d.id })}><Trash2 className="text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {drafts.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-navy-700/60">No drafts.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && <EditModal draft={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); inval(); }} />}
    </div>
  );
}

function EditModal({ draft, onClose, onDone }: { draft: Draft; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    title: draft.title, companyName: draft.company?.name ?? '', categorySlug: draft.categorySlug, emirateSlug: draft.emirateSlug,
    jobType: draft.jobType, experienceLevel: draft.experienceLevel ?? '', salaryMin: draft.salaryMin?.toString() ?? '', salaryMax: draft.salaryMax?.toString() ?? '',
    description: draft.description, contactWhatsapp: draft.contactWhatsapp ?? '', contactEmail: draft.applyEmail ?? '',
    visaProvided: draft.visaProvided, accommodationProvided: draft.accommodationProvided, isUrgent: draft.isUrgent, isFresher: draft.isFresher,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const update = trpc.admin.updateDraft.useMutation();
  const publish = trpc.admin.publishDraft.useMutation();
  const busy = update.isPending || publish.isPending;

  function payload() {
    return {
      id: draft.id, title: f.title, companyName: f.companyName || undefined, categorySlug: f.categorySlug, emirateSlug: f.emirateSlug,
      jobType: f.jobType, experienceLevel: f.experienceLevel || null,
      salaryMin: f.salaryMin ? Number(f.salaryMin) : null, salaryMax: f.salaryMax ? Number(f.salaryMax) : null,
      description: f.description, contactWhatsapp: f.contactWhatsapp || undefined, contactEmail: f.contactEmail || undefined,
      visaProvided: f.visaProvided, accommodationProvided: f.accommodationProvided, isUrgent: f.isUrgent, isFresher: f.isFresher,
    };
  }

  async function save(thenPublish: boolean) {
    if (f.title.trim().length < 3) return toast.error('Title too short');
    if (!f.emirateSlug) return toast.error('Select an emirate');
    if (f.description.trim().length < 10) return toast.error('Description too short');
    try {
      await update.mutateAsync(payload());
      if (thenPublish) { await publish.mutateAsync({ id: draft.id }); toast.success('Saved & published'); }
      else toast.success('Saved as draft');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="flex max-h-[100vh] w-full flex-col bg-white sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <h2 className="font-display text-lg font-bold text-navy-900">Review &amp; edit draft</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {(() => {
            const meta = draft.sourceMetadata as SenderMeta | null;
            const phone = formatPhone(meta?.from);
            if (!phone && draft.source !== 'whapi' && draft.source !== 'whatsapp') return null;
            return (
              <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3 text-sm text-navy-800">
                {phone ? (
                  <p>
                    Received from: {meta?.fromName ? `${meta.fromName} ` : ''}
                    <a href={`https://wa.me/${waDigits(meta?.from)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-700 hover:underline">({phone})</a>
                  </p>
                ) : (
                  <p>Received via {draft.source}</p>
                )}
                <p className="text-xs text-navy-700/60">
                  Via: WhatsApp{meta?.receivedAt ? ` · ${new Date(meta.receivedAt).toLocaleString('en-AE')}` : ''}
                </p>
                {meta?.chatName && <p className="text-xs text-navy-700/60">Group: {meta.chatName}</p>}
              </div>
            );
          })()}
          <Field label="Job Title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Company"><Input value={f.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="Direct Employer" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category"><Select value={f.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
            <Field label="Emirate"><Select value={f.emirateSlug} onChange={(e) => set('emirateSlug', e.target.value)}><option value="">Select emirate</option>{EMIRATES.map((em) => <option key={em.slug} value={em.slug}>{em.name}</option>)}</Select></Field>
            <Field label="Salary Min (AED)"><Input type="number" value={f.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} /></Field>
            <Field label="Salary Max (AED)"><Input type="number" value={f.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} /></Field>
            <Field label="Experience"><Select value={f.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}><option value="">Not specified</option>{EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{formatExperience(l)}</option>)}</Select></Field>
            <Field label="Job Type"><Select value={f.jobType} onChange={(e) => set('jobType', e.target.value)}>{JOB_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace('-', ' ')}</option>)}</Select></Field>
          </div>
          <Field label="Description"><Textarea className="min-h-[150px]" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact WhatsApp"><Input type="tel" value={f.contactWhatsapp} onChange={(e) => set('contactWhatsapp', e.target.value)} placeholder="+9715xxxxxxxx" /></Field>
            <Field label="Contact Email"><Input type="email" value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <Toggle label="Visa Provided" checked={f.visaProvided} onChange={(v) => set('visaProvided', v)} />
            <Toggle label="Accommodation" checked={f.accommodationProvided} onChange={(v) => set('accommodationProvided', v)} />
            <Toggle label="Urgent" checked={f.isUrgent} onChange={(v) => set('isUrgent', v)} />
            <Toggle label="Freshers Welcome" checked={f.isFresher} onChange={(v) => set('isFresher', v)} />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t px-5 py-3">
          <Button onClick={() => save(true)} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Save &amp; Publish</Button>
          <Button variant="outline" onClick={() => save(false)} disabled={busy}>Save as Draft</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-navy-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded text-teal-600" /> {label}
    </label>
  );
}
