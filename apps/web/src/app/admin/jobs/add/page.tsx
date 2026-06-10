'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { ClipboardPaste, MessageCircle, Table2, Zap, Link2, FilePen, Loader2, Sparkles, Upload, Download, Check, X, ImagePlus, Send, RefreshCw } from 'lucide-react';
import { EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { AdminJobReviewForm, type DraftInit } from '@/components/admin/job-review-form';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea, Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'paste', label: 'Quick Paste', icon: ClipboardPaste },
  { key: 'poster', label: 'Poster Image', icon: ImagePlus },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'whapi', label: 'WhatsApp Auto', icon: MessageCircle },
  { key: 'telegram', label: 'Telegram', icon: Send },
  { key: 'csv', label: 'CSV Bulk', icon: Table2 },
  { key: 'quick', label: 'Quick Form', icon: Zap },
  { key: 'url', label: 'URL Import', icon: Link2 },
  { key: 'manual', label: 'Manual', icon: FilePen },
] as const;

export default function AddJobPage() {
  return (
    <Suspense fallback={null}>
      <AddJobInner />
    </Suspense>
  );
}

function AddJobInner() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('paste');
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Add Job</h1>
        <Button asChild variant="outline" size="sm"><Link href="/admin/jobs/drafts">View Drafts</Link></Button>
      </div>
      <p className="text-navy-700/60">Six ways to add a job — all feed the same review form. Admin posts go live immediately.</p>

      <div className="mt-6 flex gap-2 overflow-x-auto scrollbar-hide pb-1 sm:flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn('inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 py-2 text-sm font-medium', tab === t.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'bg-white text-navy-700 hover:bg-navy-50')}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'paste' && <PasteTab />}
        {tab === 'poster' && <PosterTab />}
        {tab === 'whatsapp' && <WhatsAppTab />}
        {tab === 'whapi' && <WhapiTab />}
        {tab === 'telegram' && <TelegramTab />}
        {tab === 'csv' && <CsvTab />}
        {tab === 'quick' && <QuickTab />}
        {tab === 'url' && <UrlTab />}
        {tab === 'manual' && <AdminJobReviewForm source="manual" />}
      </div>
    </div>
  );
}

function PasteTab() {
  const params = useSearchParams();
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<DraftInit | null>(null);
  const [aiFailed, setAiFailed] = useState(false);
  // Non-blocking: AI failure (or empty fallback) never errors — the form opens for manual fill.
  const extract = trpc.ai.extractJobFromText.useMutation({
    onSuccess: (d) => {
      if (d.title && d.title.trim()) { setDraft(d); setAiFailed(false); }
      else { setDraft(null); setAiFailed(true); }
    },
    onError: () => { setDraft(null); setAiFailed(true); },
  });
  const autoRan = useRef(false);

  function run(value: string) { setAiFailed(false); extract.mutate({ text: value }); }

  // Prefill + auto-extract from ?text= (bookmarklet / share target).
  useEffect(() => {
    const shared = params.get('text');
    if (shared && !autoRan.current) {
      autoRan.current = true;
      setText(shared);
      if (shared.trim().length >= 15) run(shared);
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="rounded-xl border bg-white p-5">
        <Label>Paste any job text — WhatsApp message, email, PDF text, any format</Label>
        <Textarea className="mt-2 min-h-[180px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the raw job text here…" />
        <Button className="mt-3 w-full sm:w-auto" onClick={() => run(text)} disabled={extract.isPending || text.trim().length < 15}>
          {extract.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Extract & Fill
        </Button>
        {aiFailed && <p className="mt-2 text-sm text-navy-700/60">AI auto-fill unavailable, please fill manually.</p>}
      </div>
      {draft && <AdminJobReviewForm draft={draft} source="paste" onReset={() => { setDraft(null); setText(''); setAiFailed(false); }} />}
      {!draft && aiFailed && <AdminJobReviewForm source="paste" />}
    </div>
  );
}

// ── WhatsApp Auto-Import (Whapi) + Telegram tabs ──
function SetupCard({ title, steps, children }: { title: string; steps: string[]; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display font-bold text-navy-900">{title}</h3>
        {children}
      </div>
      <ol className="mt-3 space-y-1 text-sm text-navy-700/80">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
    </div>
  );
}

function StatusDot({ ok, configured, loading }: { ok?: boolean; configured?: boolean; loading?: boolean }) {
  if (loading) return <span className="text-xs text-navy-500">Checking…</span>;
  const color = ok ? '#16a34a' : configured ? '#ea7a3c' : '#94a3b8';
  const label = ok ? 'Connected' : configured ? 'Configured' : 'Not set';
  return <span className="inline-flex items-center gap-1.5 text-xs text-navy-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> {label}</span>;
}

function DraftsList({ q, empty }: { q: { isLoading: boolean; data?: { id: string; title: string }[] }; empty: string }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="font-display font-bold text-navy-900">Recent drafts</h3>
      {q.isLoading ? <Loader2 className="mt-2 animate-spin text-teal-500" /> : q.data && q.data.length ? (
        <ul className="mt-3 space-y-2">
          {q.data.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-navy-900">{d.title}</span>
              <Link href={`/admin/jobs/${d.id}/edit`} className="shrink-0 text-teal-600 hover:underline">Review &amp; publish</Link>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-navy-700/60">{empty}</p>}
    </div>
  );
}

function WhapiTab() {
  const status = trpc.admin.whapiStatus.useQuery();
  const drafts = trpc.admin.recentDrafts.useQuery({ source: 'whapi' });
  return (
    <div className="space-y-4">
      <SetupCard
        title="WhatsApp Auto-Import (Whapi — free)"
        steps={[
          '1. Create a free account at whapi.cloud and connect your WhatsApp.',
          '2. Copy your API key → set WHAPI_API_KEY. Set WHAPI_TOKEN to any random string.',
          '3. In Whapi → Webhooks, set URL: https://ddotsmediajobs.com/api/whatsapp/whapi',
          '4. Add request header  x-whapi-token = your WHAPI_TOKEN value.',
          '5. Forward any job message to your connected WhatsApp number — a draft appears below.',
        ]}
      >
        <StatusDot ok={status.data?.connected} configured={status.data?.configured} loading={status.isLoading} />
      </SetupCard>
      <DraftsList q={drafts} empty="No WhatsApp drafts yet." />
    </div>
  );
}

function TelegramTab() {
  const drafts = trpc.admin.recentDrafts.useQuery({ source: 'telegram' });
  const [configured, setConfigured] = useState<boolean | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try { const r = await fetch('/api/telegram/setup'); const d = (await r.json()) as { configured?: boolean }; setConfigured(d.configured); } catch { /* ignore */ }
  }
  useEffect(() => { void refresh(); }, []);

  async function activate() {
    setBusy(true);
    try {
      const r = await fetch('/api/telegram/setup', { method: 'POST' });
      const d = (await r.json()) as { ok?: boolean; error?: string; description?: string };
      if (d.ok) { toast.success('Telegram webhook activated'); void refresh(); }
      else toast.error(d.error ?? d.description ?? 'Activation failed');
    } catch { toast.error('Activation failed'); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <SetupCard
        title="Telegram Bot (free)"
        steps={[
          '1. Open Telegram → message @BotFather → /newbot. Name it DdotsJobs Admin Bot.',
          '2. Copy the bot token → set TELEGRAM_BOT_TOKEN.',
          '3. Message @userinfobot to get your chat ID → set TELEGRAM_ADMIN_CHAT_ID.',
          '4. Set TELEGRAM_SECRET to any random string, then click Activate Webhook.',
          '5. Forward job messages to your bot. Commands: /drafts /stats /approve <id> /reject <id>.',
        ]}
      >
        <div className="flex items-center gap-3">
          <StatusDot ok={configured} configured={configured} loading={configured === undefined} />
          <Button size="sm" onClick={activate} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <RefreshCw className="h-4 w-4" />} Activate Webhook</Button>
        </div>
      </SetupCard>
      <DraftsList q={drafts} empty="No Telegram drafts yet." />
    </div>
  );
}

const POSTER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;

function PosterTab() {
  const [preview, setPreview] = useState<{ url: string; name: string; isPdf: boolean } | null>(null);
  const [draft, setDraft] = useState<DraftInit | null>(null);
  const extract = trpc.ai.extractJobFromImage.useMutation({ onSuccess: (d) => setDraft(d as DraftInit), onError: (e) => toast.error(e.message) });

  function onFile(file: File) {
    if (!(POSTER_TYPES as readonly string[]).includes(file.type)) return toast.error('Upload a JPG, PNG, WebP or PDF poster.');
    if (file.size > 8 * 1024 * 1024) return toast.error('File must be under 8MB.');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(',')[1] ?? '';
      setPreview({ url: dataUrl, name: file.name, isPdf: file.type === 'application/pdf' });
      setDraft(null);
      extract.mutate({ imageBase64: base64, mediaType: file.type as (typeof POSTER_TYPES)[number] });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="rounded-xl border bg-white p-5">
        <Label>Upload a job poster (JPG, PNG, WebP or PDF) — Claude Vision reads it and fills the form</Label>
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-navy-200 p-8 text-center text-sm text-navy-700/70 hover:bg-navy-50">
          {extract.isPending ? <Loader2 className="h-6 w-6 animate-spin text-teal-500" /> : <ImagePlus className="h-6 w-6 text-teal-600" />}
          {extract.isPending ? 'Reading poster…' : 'Click to choose a poster image or PDF'}
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {preview && (
          <div className="mt-4 flex items-center gap-3">
            {preview.isPdf ? (
              <div className="flex h-20 w-16 items-center justify-center rounded border bg-navy-50 text-xs text-navy-600">PDF</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="poster" className="h-24 w-auto rounded border object-contain" />
            )}
            <span className="text-sm text-navy-700/70">{preview.name}</span>
          </div>
        )}
      </div>
      {draft && <AdminJobReviewForm draft={draft} source="poster" onReset={() => { setDraft(null); setPreview(null); }} />}
    </div>
  );
}

function UrlTab() {
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState<DraftInit | null>(null);
  const extract = trpc.ai.extractJobFromUrl.useMutation({ onSuccess: (d) => setDraft(d), onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="flex flex-col gap-2 rounded-xl border bg-white p-5 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5"><Label>Paste job URL from any website</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…  (LinkedIn, Bayt, company careers page)" /></div>
        <Button onClick={() => extract.mutate({ url })} disabled={extract.isPending || !/^https?:\/\//.test(url)}>{extract.isPending ? <Loader2 className="animate-spin" /> : <Link2 />} Import</Button>
      </div>
      {draft && <AdminJobReviewForm draft={draft} source="url" onReset={() => { setDraft(null); setUrl(''); }} />}
    </div>
  );
}

function QuickTab() {
  const [form, setForm] = useState({ title: '', emirate: 'dubai', whatsapp: '' });
  const [draft, setDraft] = useState<DraftInit | null>(null);
  const gen = trpc.ai.generateFromQuickForm.useMutation({ onSuccess: (d) => setDraft(d), onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-3 sm:items-end">
        <div className="space-y-1.5"><Label>Job title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sales Executive" /></div>
        <div className="space-y-1.5"><Label>Emirate</Label><Select value={form.emirate} onChange={(e) => setForm({ ...form, emirate: e.target.value })}>{EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</Select></div>
        <div className="space-y-1.5"><Label>WhatsApp contact</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+9715xxxxxxxx" /></div>
        <div className="sm:col-span-3"><Button onClick={() => gen.mutate({ title: form.title, emirate: form.emirate, whatsapp: form.whatsapp || undefined })} disabled={gen.isPending || form.title.trim().length < 2}>{gen.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate Full Job Post</Button></div>
      </div>
      {draft && <AdminJobReviewForm draft={draft} source="quick" onReset={() => setDraft(null)} />}
    </div>
  );
}

function WhatsAppTab() {
  const drafts = trpc.admin.draftJobs.useQuery({ source: 'whatsapp' });
  const publish = trpc.admin.publishDraft.useMutation({ onSuccess: () => { drafts.refetch(); toast.success('Published'); } });
  const number = '+971500000000'; // configure your Twilio/WhatsApp number in settings
  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-[1fr_auto]">
        <div>
          <h3 className="font-display font-bold text-navy-900">Forward job messages to WhatsApp</h3>
          <p className="mt-1 text-sm text-navy-700/70">Forward any job message to <span className="font-semibold text-navy-900">{number}</span>. The bot extracts it with AI and creates a draft here for review. (Configure the Twilio number + webhook <code>/api/whatsapp/job-import</code> in settings.)</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://wa.me/${number.replace(/\D/g, '')}`)}`} alt="WhatsApp QR" width={120} height={120} className="rounded-lg border" />
      </div>

      <div>
        <h3 className="mb-2 font-display font-bold text-navy-900">WhatsApp-imported drafts</h3>
        {drafts.isLoading && <Loader2 className="animate-spin text-teal-500" />}
        {drafts.data?.length === 0 && <p className="rounded-xl border bg-white p-8 text-center text-navy-700/60">No WhatsApp drafts yet.</p>}
        <div className="space-y-2">
          {drafts.data?.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
              <div><p className="font-semibold text-navy-900">{d.title}</p><p className="text-xs text-navy-700/50">{d.company?.name ?? 'Confidential'}</p></div>
              <Button size="sm" onClick={() => publish.mutate({ id: d.id })}>Publish</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CSV_COLS = ['title', 'company', 'emirate', 'categorySlug', 'jobType', 'salaryMin', 'salaryMax', 'description', 'area', 'visaProvided', 'accommodation', 'freshers', 'remote', 'urgent', 'tags', 'whatsapp'];
const REQUIRED = ['title', 'emirate', 'categorySlug', 'jobType', 'description'];

function CsvTab() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const bulk = trpc.admin.bulkCreateJobs.useMutation({
    onSuccess: (r) => { toast.success(`Created ${r.created}${r.errors.length ? `, ${r.errors.length} failed` : ''}`); setRows([]); },
    onError: (e) => toast.error(e.message),
  });

  function downloadTemplate() {
    const csv = CSV_COLS.join(',') + '\n' + 'Sales Executive,Acme LLC,dubai,sales,full-time,5000,8000,"Great sales role",Deira,true,false,false,false,true,"sales;b2b",+971500000000';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'jobs-template.csv'; a.click();
  }

  function onFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => { setRows(res.data); toast.success(`Parsed ${res.data.length} rows`); },
      error: () => toast.error('Could not parse CSV'),
    });
  }

  const valid = (r: Record<string, string>) => REQUIRED.every((c) => (r[c] ?? '').trim().length > 0);
  const validRows = rows.filter(valid);

  function toInput(r: Record<string, string>) {
    const b = (v?: string) => /^(true|yes|1)$/i.test((v ?? '').trim());
    return {
      title: r.title, description: r.description, companyName: r.company || undefined,
      categorySlug: r.categorySlug, emirateSlug: r.emirate, location: r.area || undefined, jobType: r.jobType,
      salaryMin: r.salaryMin ? Number(r.salaryMin) : null, salaryMax: r.salaryMax ? Number(r.salaryMax) : null,
      visaProvided: b(r.visaProvided), accommodationProvided: b(r.accommodation), isFresher: b(r.freshers),
      isRemote: b(r.remote), isUrgent: b(r.urgent), contactWhatsapp: r.whatsapp || undefined,
      skills: (r.tags ?? '').split(';').map((s) => s.trim()).filter(Boolean),
      source: 'csv' as const, status: 'active' as const,
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={downloadTemplate}><Download /> Download template</Button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50">
          <Upload className="h-4 w-4" /> Upload CSV
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      </div>

      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-xs">
              <thead className="border-b bg-navy-50 text-left text-navy-700"><tr><th className="px-3 py-2"></th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Emirate</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Salary</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={cn('border-b last:border-0', valid(r) ? '' : 'bg-accent-50')}>
                    <td className="px-3 py-2">{valid(r) ? <Check className="h-4 w-4 text-lime-600" /> : <X className="h-4 w-4 text-accent-500" />}</td>
                    <td className="px-3 py-2 font-medium text-navy-900">{r.title || <span className="text-accent-600">missing</span>}</td>
                    <td className="px-3 py-2">{r.emirate || <span className="text-accent-600">missing</span>}</td>
                    <td className="px-3 py-2">{r.categorySlug || <span className="text-accent-600">missing</span>}</td>
                    <td className="px-3 py-2">{r.salaryMin}-{r.salaryMax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success">{validRows.length} valid</Badge>
            {rows.length - validRows.length > 0 && <Badge variant="urgent">{rows.length - validRows.length} invalid</Badge>}
            <Button onClick={() => bulk.mutate({ jobs: validRows.map(toInput) as never })} disabled={bulk.isPending || validRows.length === 0}>
              {bulk.isPending ? <Loader2 className="animate-spin" /> : null} Publish {validRows.length} valid
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
