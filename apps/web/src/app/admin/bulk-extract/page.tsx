'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Wand2, Check, X, Layers, Trash2 } from 'lucide-react';
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

/** Map an editable card to the admin.bulkCreateJobs input shape. */
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
    contactWhatsapp: d.contactWhatsapp.trim() || undefined,
    applyEmail: EMAIL_RE.test(d.contactEmail.trim()) ? d.contactEmail.trim() : undefined,
    source: 'paste' as const,
    status,
  };
}

export default function BulkExtractPage() {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  const extract = trpc.ai.bulkExtractJobs.useMutation({
    onSuccess: (jobs) => {
      if (!jobs.length) {
        toast.info('No vacancies found — try pasting more detail or add manually.');
        setRows([]);
        return;
      }
      setRows(jobs.map((j) => ({ ...j, selected: true })));
      toast.success(`Found ${jobs.length} ${jobs.length === 1 ? 'vacancy' : 'vacancies'}`);
    },
    onError: (e) => toast.error(e.message || 'Extraction failed'),
  });

  const bulk = trpc.admin.bulkCreateJobs.useMutation();

  const selectedCount = useMemo(() => rows.filter((r) => r.selected && r.title.trim().length >= 3).length, [rows]);

  function patch(i: number, p: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  }

  async function publish(status: 'active' | 'draft') {
    const picked = rows.filter((r) => r.selected && r.title.trim().length >= 3);
    if (!picked.length) return toast.error('Select at least one job (title needs 3+ characters).');
    try {
      const res = await bulk.mutateAsync({ jobs: picked.map((d) => toJobInput(d, status)) as never });
      const verb = status === 'active' ? 'Published' : 'Saved as draft';
      toast.success(`${verb} ${res.created}${res.errors.length ? ` · ${res.errors.length} failed` : ''}`);
      if (res.errors.length) console.warn('[bulk-extract] row errors', res.errors);
      // Drop the rows that were just saved; keep nothing on full success.
      if (res.created > 0) setRows((prev) => prev.filter((r) => !(r.selected && r.title.trim().length >= 3)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
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

      {rows.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r, i) => (
            <JobCard key={i} row={r} index={i} onPatch={patch} onRemove={() => setRows((p) => p.filter((_, idx) => idx !== i))} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-semibold text-navy-900">
              {selectedCount} of {rows.length} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => publish('draft')} disabled={bulk.isPending || selectedCount === 0}>
                {bulk.isPending ? <Loader2 className="animate-spin" /> : null} Save as Drafts
              </Button>
              <Button onClick={() => publish('active')} disabled={bulk.isPending || selectedCount === 0}>
                {bulk.isPending ? <Loader2 className="animate-spin" /> : <Check />} Publish All Selected
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
