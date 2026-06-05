'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Upload, Download, Check, X, MessageCircle } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Badge } from '@/components/ui/primitives';

const WEBHOOK_URL = `${SITE.url}/api/webhooks/whatsapp`;
const CSV_COLS = ['title', 'company', 'category', 'emirate', 'salary_min', 'salary_max', 'job_type', 'visa_provided', 'accommodation', 'contact_whatsapp', 'description'];

type Row = Record<string, string>;

export default function WhatsappBotPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-[#25D366]" />
        <h1 className="font-display text-2xl font-bold text-navy-900">WhatsApp Bot Dashboard</h1>
      </div>
      <BotStatus />
      <Numbers />
      <BulkCsv />
      <Activity />
    </div>
  );
}

function BotStatus() {
  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="font-display font-bold text-navy-900">Bot Status</h2>
      <p className="mt-1 text-sm text-green-700">Provider: Whapi.Cloud · Bot Active ✅</p>
      <p className="mt-2 text-sm text-navy-700/70">Webhook URL:</p>
      <code className="mt-1 block break-all rounded bg-navy-50 px-3 py-2 text-xs text-navy-900">{WEBHOOK_URL}</code>
      <div className="mt-3 rounded-lg bg-navy-50 p-3 text-xs text-navy-700/80">
        <p className="font-semibold text-navy-900">Whapi setup (if not done):</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>whapi.cloud → Dashboard → your channel</li>
          <li>Settings → Webhooks</li>
          <li>Set URL to the address above</li>
          <li>Enable: messages.inbound, messages.media</li>
          <li>Save — webhook is live immediately</li>
        </ol>
      </div>
    </section>
  );
}

function Numbers() {
  const utils = trpc.useUtils();
  const numbers = trpc.admin.waBotNumbers.useQuery();
  const inval = () => utils.admin.waBotNumbers.invalidate();
  const add = trpc.admin.waBotAddNumber.useMutation({ onSuccess: () => { inval(); toast.success('Number added'); }, onError: (e) => toast.error(e.message) });
  const toggle = trpc.admin.waBotToggleNumber.useMutation({ onSuccess: inval });
  const del = trpc.admin.waBotDeleteNumber.useMutation({ onSuccess: () => { inval(); toast.success('Removed'); } });

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    add.mutate({ phone: String(f.get('phone')).trim(), name: String(f.get('name')).trim() || undefined });
    e.currentTarget.reset();
  }

  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="font-display font-bold text-navy-900">Authorized Numbers</h2>
      <p className="text-sm text-navy-700/60">Only these WhatsApp numbers may post via the bot.</p>
      <form onSubmit={onAdd} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="space-y-1"><Label>Phone (+971…)</Label><Input name="phone" placeholder="+971501234567" required /></div>
        <div className="space-y-1"><Label>Name</Label><Input name="name" placeholder="Optional" /></div>
        <Button type="submit" disabled={add.isPending}>{add.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Add Number</Button>
      </form>
      <div className="mt-4 divide-y rounded-lg border">
        {numbers.data?.length === 0 && <p className="p-4 text-sm text-navy-700/60">No numbers yet. Add your WhatsApp number to start.</p>}
        {numbers.data?.map((n) => (
          <div key={n.id} className="flex items-center justify-between gap-3 p-3">
            <div>
              <p className="font-medium text-navy-900">{n.phone}</p>
              <p className="text-xs text-navy-700/60">{n.name || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={n.isActive ? 'success' : 'muted'}>{n.isActive ? 'Active' : 'Inactive'}</Badge>
              <Button variant="ghost" size="sm" onClick={() => toggle.mutate({ id: n.id, isActive: !n.isActive })}>{n.isActive ? 'Disable' : 'Enable'}</Button>
              <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: n.id })}><Trash2 className="text-red-500" /></Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BulkCsv() {
  const [rows, setRows] = useState<Row[]>([]);
  const bulk = trpc.admin.waBotBulkCreate.useMutation({
    onSuccess: (r) => { toast.success(`${r.posted} posted, ${r.failed} failed`); setRows([]); },
    onError: (e) => toast.error(e.message),
  });

  function onFile(file: File) {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRows(res.data.filter((r) => Object.keys(r).length > 0)),
    });
  }
  function downloadTemplate() {
    const sample = [
      { title: 'Light Driver', company: 'Al Noor', category: 'driving', emirate: 'dubai', salary_min: '3000', salary_max: '4000', job_type: 'full-time', visa_provided: 'yes', accommodation: 'yes', contact_whatsapp: '+971501234567', description: 'UAE licence required.' },
      { title: 'Staff Nurse', company: 'Ahalia', category: 'healthcare', emirate: 'abu-dhabi', salary_min: '5000', salary_max: '7000', job_type: 'full-time', visa_provided: 'yes', accommodation: 'no', contact_whatsapp: '+971502223333', description: 'DOH licence preferred.' },
    ];
    const csv = Papa.unparse({ fields: CSV_COLS, data: sample.map((s) => CSV_COLS.map((c) => (s as Row)[c] ?? '')) });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'whatsapp-bot-jobs-template.csv';
    a.click();
  }
  const valid = (r: Row) => (r.title ?? '').trim().length >= 3 && (r.emirate ?? '').trim().length > 0;

  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-bold text-navy-900">Bulk CSV Upload</h2>
        <Button variant="outline" size="sm" onClick={downloadTemplate}><Download /> Download template</Button>
      </div>
      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-navy-200 p-6 text-sm text-navy-700/70 hover:bg-navy-50">
        <Upload className="h-4 w-4" /> Choose CSV file
        <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {rows.length > 0 && (
        <div className="mt-4">
          <div className="max-h-72 overflow-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-navy-50"><tr>{['', 'title', 'emirate', 'salary', 'contact'].map((h) => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={valid(r) ? '' : 'bg-red-50'}>
                    <td className="px-3 py-2">{valid(r) ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-red-500" />}</td>
                    <td className="px-3 py-2">{r.title}</td><td className="px-3 py-2">{r.emirate}</td>
                    <td className="px-3 py-2">{r.salary_min}-{r.salary_max}</td><td className="px-3 py-2">{r.contact_whatsapp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button className="mt-3" disabled={bulk.isPending} onClick={() => bulk.mutate({ jobs: rows.filter(valid) })}>
            {bulk.isPending ? <Loader2 className="animate-spin" /> : <Upload />} Post {rows.filter(valid).length} valid jobs
          </Button>
        </div>
      )}
    </section>
  );
}

function Activity() {
  const logs = trpc.admin.waBotLogs.useQuery();
  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="font-display font-bold text-navy-900">Recent Bot Activity</h2>
      <div className="mt-3 max-h-96 overflow-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-navy-50"><tr>{['Time', 'Phone', 'Dir', 'Message'].map((h) => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {logs.data?.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="whitespace-nowrap px-3 py-2 text-navy-700/60">{new Date(l.createdAt).toLocaleString('en-AE')}</td>
                <td className="px-3 py-2">{l.phone}</td>
                <td className="px-3 py-2"><Badge variant={l.direction === 'in' ? 'muted' : 'success'}>{l.direction}</Badge></td>
                <td className="max-w-md truncate px-3 py-2 text-navy-700">{l.message}</td>
              </tr>
            ))}
            {logs.data?.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-navy-700/60">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
