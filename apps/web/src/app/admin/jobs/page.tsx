'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Star, Trash2, ExternalLink, Search, Pencil, Check, X, Download } from 'lucide-react';
import { JOB_STATUS, formatSalary, formatShort } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Input, Select, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { SourceBadge } from '@/components/source-badge';

export default function AdminJobsPage() {
  const utils = trpc.useUtils();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const jobs = trpc.admin.allJobs.useQuery({ q: q || undefined, status: status || undefined, page: 1 });
  const adminStats = trpc.admin.stats.useQuery();
  const TABS: { label: string; value: string; badge: number }[] = [
    { label: 'All Jobs', value: '', badge: 0 },
    { label: 'Drafts', value: 'draft', badge: adminStats.data?.draftJobs ?? 0 },
    { label: 'Pending', value: 'pending', badge: adminStats.data?.pendingJobs ?? 0 },
    { label: 'Expired', value: 'expired', badge: adminStats.data?.expiredJobs ?? 0 },
  ];

  const inval = () => utils.admin.allJobs.invalidate();
  const feat = trpc.admin.setJobFeatured.useMutation({ onSuccess: () => { inval(); toast.success('Updated'); } });
  const setStatusM = trpc.admin.setJobStatus.useMutation({ onSuccess: () => { inval(); toast.success('Status changed'); } });
  const del = trpc.admin.deleteJob.useMutation();
  const setStatusBulk = trpc.admin.setJobStatus.useMutation();

  const rows = jobs.data ?? [];
  const allSelected = rows.length > 0 && rows.every((j) => sel.has(j.id));

  function toggle(id: string) {
    setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSel(allSelected ? new Set() : new Set(rows.map((j) => j.id)));
  }

  async function bulkStatus(next: 'active' | 'rejected') {
    setBusy(true);
    try {
      await Promise.all([...sel].map((id) => setStatusBulk.mutateAsync({ id, status: next })));
      toast.success(`${sel.size} job(s) ${next === 'active' ? 'approved' : 'rejected'}`);
      setSel(new Set());
      inval();
    } catch { toast.error('Bulk update failed'); } finally { setBusy(false); }
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${sel.size} job(s)? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await Promise.all([...sel].map((id) => del.mutateAsync({ id })));
      toast.success(`${sel.size} job(s) deleted`);
      setSel(new Set());
      inval();
    } catch { toast.error('Bulk delete failed'); } finally { setBusy(false); }
  }

  function exportCsv() {
    const src = sel.size ? rows.filter((j) => sel.has(j.id)) : rows;
    const head = ['Title', 'Company', 'Status', 'SalaryMin', 'SalaryMax', 'Slug', 'Created'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = src.map((j) =>
      [j.title, j.company?.name ?? '', j.status, j.salaryMin ?? '', j.salaryMax ?? '', j.slug, new Date(j.createdAt).toISOString()].map(esc).join(','),
    );
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `jobs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Jobs</h1>

      {/* Status tabs — horizontal scroll on mobile, teal underline on active. */}
      <div className="mt-4 -mx-1 flex gap-1 overflow-x-auto border-b px-1 scrollbar-hide">
        {TABS.map((t) => {
          const active = status === t.value;
          return (
            <button
              key={t.value || 'all'}
              type="button"
              onClick={() => { setStatus(t.value); setSel(new Set()); }}
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                active ? 'text-teal-700' : 'text-navy-700/60 hover:text-navy-900'
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-teal-100 text-teal-700' : 'bg-navy-100 text-navy-700'}`}>
                  {t.badge}
                </span>
              )}
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-teal-600" />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-white px-3">
          <Search className="h-4 w-4 text-navy-700/40" />
          <Input className="border-0 focus-visible:ring-0" placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {JOB_STATUS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </Select>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      {sel.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm">
          <span className="font-medium text-navy-900">{sel.size} selected</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => bulkStatus('active')}><Check className="h-4 w-4 text-green-600" /> Approve</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => bulkStatus('rejected')}><X className="h-4 w-4 text-orange-600" /> Reject</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={bulkDelete}><Trash2 className="h-4 w-4 text-red-500" /> Delete</Button>
          <button className="ml-auto text-navy-700/60 hover:underline" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {jobs.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
                <th className="px-4 py-3">Title</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Posted</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Salary</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Status</th><th className="sticky right-0 bg-navy-50 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => (
                <tr key={j.id} className="border-b last:border-0 odd:bg-white even:bg-navy-50/40 hover:bg-teal-50/40">
                  <td className="px-4 py-3"><input type="checkbox" checked={sel.has(j.id)} onChange={() => toggle(j.id)} aria-label={`Select ${j.title}`} /></td>
                  <td className="px-4 py-3 font-medium text-navy-900">
                    {j.title} {j.isFeatured && <Badge className="ml-1">★</Badge>}
                  </td>
                  <td className="px-4 py-3 text-navy-700/70">{j.company?.name ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-navy-700/60">{formatShort(j.publishedAt ?? j.createdAt)}</td>
                  <td className="px-4 py-3"><SourceBadge source={j.source} /></td>
                  <td className="px-4 py-3 text-navy-700/70">{formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden, j.salaryNegotiable)}</td>
                  <td className="px-4 py-3 text-navy-700/60">{j.viewCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <Select className="h-8 w-28 text-xs" value={j.status} onChange={(e) => setStatusM.mutate({ id: j.id, status: e.target.value as never })}>
                      {JOB_STATUS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </Select>
                  </td>
                  <td className="sticky right-0 bg-white px-4 py-3 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => feat.mutate({ id: j.id, featured: !j.isFeatured })} title="Toggle featured">
                        <Star className={j.isFeatured ? 'fill-gold-500 text-gold-500' : ''} />
                      </Button>
                      <Button asChild variant="ghost" size="icon" title="Edit"><Link href={`/admin/jobs/${j.id}/edit`}><Pencil /></Link></Button>
                      <Button asChild variant="ghost" size="icon" title="Preview"><Link href={`/jobs/${j.slug}`} target="_blank"><ExternalLink /></Link></Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm('Delete this job? This cannot be undone.')) del.mutate({ id: j.id }, { onSuccess: () => { utils.admin.allJobs.setData({ q: q || undefined, status: status || undefined, page: 1 }, (prev) => prev?.filter((r) => r.id !== j.id)); inval(); toast.success('Job deleted'); } }); }}><Trash2 className="text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-navy-700/60">No jobs.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
