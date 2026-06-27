'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Wand2, Check, X, Layers, Trash2, AlertTriangle } from 'lucide-react';
import { CATEGORIES, EMIRATES, JOB_TYPES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea, Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

type Draft = {
  title: string;
  company: string;
  emirate: string;
  area: string;
  categorySlug: string;
  jobType: string;
  salaryMin: number;
  salaryMax: number;
  description: string;
  requirements: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
  visaProvided: boolean;
  accommodation: boolean;
  freshersWelcome: boolean;
  remote: boolean;
  urgent: boolean;
  vacancies: number;
};

type Row = Draft & { selected: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Map an editable card to the admin.createJob input shape. */
function toJobInput(d: Draft, status: 'active' | 'draft') {
  const desc =
    [d.description.trim(), d.requirements.trim() ? `Requirements:\n${d.requirements.trim()}` : '']
      .filter(Boolean)
      .join('\n\n') || `${d.title} at ${d.company}.`;
  return {
    title: d.title.trim(),
    description: desc.length >= 10 ? desc : `${desc} — apply now.`,
    companyName: d.company.trim() || undefined,
    categorySlug: d.categorySlug,
    emirateSlug: d.emirate,
    location: d.area.trim() || undefined,
    jobType: d.jobType,
    salaryMin: d.salaryMin > 0 ? d.salaryMin : null,
    salaryMax: d.salaryMax > 0 ? d.salaryMax : null,
    visaProvided: d.visaProvided,
    accommodationProvided: d.accommodation,
    isRemote: d.remote,
    isUrgent: d.urgent,
    isFresher: d.freshersWelcome,
    // No separate phone field on jobs — WhatsApp falls back to any plain phone.
    contactWhatsapp: (d.contactWhatsapp.trim() || d.contactPhone.trim()) || undefined,
    applyEmail: EMAIL_RE.test(d.contactEmail.trim()) ? d.contactEmail.trim() : undefined,
    source: 'paste' as const,
    status,
  };
}

type Failure = { title: string; error: string };

export default function BulkExtractPage() {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ published: number; status: 'active' | 'draft'; failures: Failure[] } | null>(null);
  const [noResults, setNoResults] = useState(false);

  const extract = trpc.ai.bulkExtractJobs.useMutation({
    onMutate: () => {
      setResult(null);
      setNoResults(false);
    },
    onSuccess: (jobs) => {
      if (!jobs.length) {
        setRows([]);
        setNoResults(true);
        return;
      }
      setNoResults(false);
      setRows(jobs.map((j) => ({ ...j, selected: true })));
      toast.success(`Found ${jobs.length} ${jobs.length === 1 ? 'vacancy' : 'vacancies'}`);
    },
    onError: (e) => {
      setNoResults(false);
      toast.error(e.message || 'Extraction failed');
    },
  });

  const create = trpc.admin.createJob.useMutation();

  const selectedCount = useMemo(() => rows.filter((r) => r.selected && r.title.trim().length >= 3).length, [rows]);
  const publishing = progress !== null;

  function patch(i: number, p: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  }

  async function publish(status: 'active' | 'draft') {
    const picked = rows.filter((r) => r.selected && r.title.trim().length >= 3);
    if (!picked.length) return toast.error('Select at least one job (title needs 3+ characters).');

    setResult(null);
    setProgress({ done: 0, total: picked.length });
    const failures: Failure[] = [];
    const publishedKeys = new Set<string>();

    for (let i = 0; i < picked.length; i++) {
      const d = picked[i]!;
      try {
        await create.mutateAsync(toJobInput(d, status) as never);
        publishedKeys.add(`${d.title}__${i}`);
      } catch (e) {
        failures.push({ title: d.title || `Job ${i + 1}`, error: e instanceof Error ? e.message : 'failed' });
      }
      setProgress({ done: i + 1, total: picked.length });
    }

    const published = picked.length - failures.length;
    // Keep only the rows that failed (or were not selected) so the user can retry.
    const failedTitles = new Set(failures.map((f) => f.title));
    setRows((prev) => prev.filter((r) => !(r.selected && r.title.trim().length >= 3) || failedTitles.has(r.title || '')));
    setProgress(null);
    setResult({ published, status, failures });

    const verb = status === 'active' ? 'published' : 'saved as draft';
    if (published > 0) toast.success(`${published} ${published === 1 ? 'job' : 'jobs'} ${verb}`);
    if (failures.length) toast.error(`${failures.length} failed — see panel below`);
  }

  return (
    <div className="pb-28">
      <div className="flex items-center gap-2">
        <Layers className="h-6 w-6 text-teal-600" />
        <h1 className="font-display text-2xl font-bold text-navy-900">Bulk Job Extract</h1>
      </div>
      <p className="text-navy-700/60">Paste a message with multiple vacancies — AI splits each into its own job.</p>

      <div className="mt-6 rounded-xl border bg-white p-5">
        <Label>Paste WhatsApp message or job announcement with several roles</Label>
        <Textarea
          className="mt-2 min-h-[200px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste WhatsApp message or job announcement…"
        />
        <Button
          className="mt-3 w-full sm:w-auto"
          onClick={() => extract.mutate({ text })}
          disabled={extract.isPending || text.trim().length < 30}
        >
          {extract.isPending ? <Loader2 className="animate-spin" /> : <Wand2 />} Extract Jobs
        </Button>
        {extract.isPending && <p className="mt-2 text-sm text-navy-700/60">Extracting jobs…</p>}
      </div>

      {noResults && !extract.isPending && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-medium text-amber-800">
          ⚠️ No jobs found. Try pasting a clearer job announcement.
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-xl border bg-white p-5">
          {result.published > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 font-semibold text-lime-700">
                <Check className="h-5 w-5" /> {result.published} {result.published === 1 ? 'job' : 'jobs'}{' '}
                {result.status === 'active' ? 'published!' : 'saved as drafts!'}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href={result.status === 'active' ? '/admin/jobs' : '/admin/jobs/drafts'}>View Jobs</Link>
              </Button>
            </div>
          )}
          {result.failures.length > 0 && (
            <div className={cn(result.published > 0 && 'mt-4')}>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent-700">
                <AlertTriangle className="h-4 w-4" /> {result.failures.length} failed
              </p>
              <ul className="mt-2 space-y-1 text-sm text-navy-700/70">
                {result.failures.map((f, i) => (
                  <li key={i}>
                    <span className="font-medium text-navy-900">{f.title}</span> — {f.error}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-navy-700/50">Failed jobs are kept below — fix and click publish again to retry.</p>
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-6 grid gap-4 pb-32 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r, i) => (
            <JobCard key={i} row={r} index={i} onPatch={patch} onRemove={() => setRows((p) => p.filter((_, idx) => idx !== i))} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-navy-900">
              {progress ? `Saving ${progress.done}/${progress.total}…` : `${selectedCount} jobs selected`}
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => publish('draft')} disabled={publishing || selectedCount === 0}>
                {publishing ? <Loader2 className="animate-spin" /> : null} Save Drafts
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => publish('active')} disabled={publishing || selectedCount === 0}>
                {publishing ? <Loader2 className="animate-spin" /> : <Check />} Publish All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JobCard({
  row,
  index,
  onPatch,
  onRemove,
}: {
  row: Row;
  index: number;
  onPatch: (i: number, p: Partial<Row>) => void;
  onRemove: () => void;
}) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border bg-white p-4 transition-opacity', !row.selected && 'opacity-60')}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onPatch(index, { selected: !row.selected })}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
            row.selected ? 'bg-lime-100 text-lime-700' : 'bg-navy-100 text-navy-500',
          )}
        >
          {row.selected ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {row.selected ? 'Selected' : 'Skip'}
        </button>
        <button type="button" onClick={onRemove} className="text-navy-400 hover:text-accent-600" aria-label="Remove">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1">
        <Label>Title</Label>
        <Input value={row.title} onChange={(e) => onPatch(index, { title: e.target.value })} placeholder="Job title" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Company</Label>
          <Input value={row.company} onChange={(e) => onPatch(index, { company: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Emirate</Label>
          <Select value={row.emirate} onChange={(e) => onPatch(index, { emirate: e.target.value })}>
            {EMIRATES.map((em) => (
              <option key={em.slug} value={em.slug}>{em.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={row.categorySlug} onChange={(e) => onPatch(index, { categorySlug: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Job type</Label>
          <Select value={row.jobType} onChange={(e) => onPatch(index, { jobType: e.target.value })}>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Salary min (AED)</Label>
          <Input
            type="number"
            value={row.salaryMin || ''}
            onChange={(e) => onPatch(index, { salaryMin: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label>Salary max (AED)</Label>
          <Input
            type="number"
            value={row.salaryMax || ''}
            onChange={(e) => onPatch(index, { salaryMax: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>📞 Phone</Label>
        <Input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={row.contactPhone}
          onChange={(e) => onPatch(index, { contactPhone: e.target.value })}
          placeholder="05X XXX XXXX"
        />
      </div>
      <div className="space-y-1">
        <Label>💬 WhatsApp</Label>
        <Input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={row.contactWhatsapp}
          onChange={(e) => onPatch(index, { contactWhatsapp: e.target.value })}
          placeholder="+9715…"
        />
      </div>
      <div className="space-y-1">
        <Label>✉️ Email</Label>
        <Input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={row.contactEmail}
          onChange={(e) => onPatch(index, { contactEmail: e.target.value })}
          placeholder="jobs@…"
        />
      </div>

      {(row.visaProvided || row.accommodation || row.remote || row.urgent || row.freshersWelcome) && (
        <div className="flex flex-wrap gap-1.5">
          {row.urgent && <Badge variant="urgent">Urgent</Badge>}
          {row.visaProvided && <Badge variant="success">Visa</Badge>}
          {row.accommodation && <Badge>Accommodation</Badge>}
          {row.remote && <Badge>Remote</Badge>}
          {row.freshersWelcome && <Badge>Freshers</Badge>}
        </div>
      )}
    </div>
  );
}
