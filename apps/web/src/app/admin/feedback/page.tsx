'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, X, Mail } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Textarea, Select, Badge } from '@/components/ui/primitives';

type Status = 'unread' | 'read' | 'replied' | 'archived';
type Row = {
  id: string; name: string; email: string; phone: string | null; subject: string; message: string;
  type: string; status: string; ipAddress: string | null; adminNote: string | null; createdAt: Date | string;
};
const FILTERS: { label: string; value: Status | '' }[] = [
  { label: 'All', value: '' }, { label: 'Unread', value: 'unread' }, { label: 'Read', value: 'read' }, { label: 'Replied', value: 'replied' }, { label: 'Archived', value: 'archived' },
];

export default function AdminFeedbackPage() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Status | ''>('');
  const [open, setOpen] = useState<Row | null>(null);
  const q = trpc.admin.getFeedback.useQuery(filter ? { status: filter } : undefined);
  const update = trpc.admin.updateFeedback.useMutation({
    onSuccess: () => { utils.admin.getFeedback.invalidate(); utils.admin.feedbackUnread.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const rows = (q.data ?? []) as Row[];

  function openRow(r: Row) {
    setOpen(r);
    if (r.status === 'unread') update.mutate({ id: r.id, status: 'read' }); // auto mark read
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Feedback</h1>

      <div className="mt-4 -mx-1 flex gap-1 overflow-x-auto border-b px-1 scrollbar-hide">
        {FILTERS.map((t) => {
          const active = filter === t.value;
          return (
            <button key={t.value || 'all'} type="button" onClick={() => setFilter(t.value)}
              className={`relative shrink-0 px-4 py-2.5 text-sm font-medium ${active ? 'text-teal-700' : 'text-navy-700/60 hover:text-navy-900'}`}>
              {t.label}{active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-teal-600" />}
            </button>
          );
        })}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {q.isLoading ? <Loader2 className="m-6 animate-spin text-teal-500" /> : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700"><tr><th className="px-4 py-3">From</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer border-b last:border-0 hover:bg-navy-50/50" onClick={() => openRow(r)}>
                  <td className="px-4 py-3"><span className="flex items-center gap-2">{r.status === 'unread' && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}<span><span className="block font-medium text-navy-900">{r.name}</span><span className="block text-xs text-navy-700/50">{r.email}</span></span></span></td>
                  <td className="px-4 py-3 capitalize text-navy-700/70">{r.type}</td>
                  <td className="px-4 py-3 text-navy-900">{r.subject}</td>
                  <td className="px-4 py-3"><StatusBadge s={r.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-navy-700/50">{new Date(r.createdAt).toLocaleDateString('en-AE')}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-navy-700/60">No feedback.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {open && <FeedbackModal row={open} onClose={() => setOpen(null)} onChange={(patch) => update.mutate({ id: open.id, ...patch })} />}
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  if (s === 'unread') return <Badge variant="urgent">Unread</Badge>;
  if (s === 'replied') return <Badge variant="success">Replied</Badge>;
  if (s === 'archived') return <span className="text-xs text-navy-700/40 line-through">Archived</span>;
  return <Badge variant="muted">Read</Badge>;
}

function FeedbackModal({ row, onClose, onChange }: { row: Row; onClose: () => void; onChange: (p: { status?: Status; adminNote?: string }) => void }) {
  const [note, setNote] = useState(row.adminNote ?? '');
  const mailto = `mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.subject}`)}&body=${encodeURIComponent(`Hi ${row.name},\n\nThanks for reaching out to DdotsMediaJobs.\n\n`)}`;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full flex-col bg-white sm:max-w-lg sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <h2 className="font-display text-lg font-bold text-navy-900">{row.subject}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-navy-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-lg bg-navy-50/60 p-3 text-sm text-navy-700">
            <p><span className="font-semibold">{row.name}</span> · <span className="capitalize">{row.type}</span></p>
            <p className="text-xs text-navy-700/60">{row.email}{row.phone ? ` · ${row.phone}` : ''}{row.ipAddress ? ` · IP ${row.ipAddress}` : ''}</p>
          </div>
          <p className="whitespace-pre-wrap text-sm text-navy-800">{row.message}</p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-navy-700">Internal note</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (row.adminNote ?? '') && onChange({ adminNote: note })} placeholder="Internal note (not sent to sender)…" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={mailto} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700" onClick={() => onChange({ status: 'replied' })}><Mail className="h-4 w-4" /> Reply via Email</a>
            <Select className="h-9 w-36" value={row.status} onChange={(e) => onChange({ status: e.target.value as Status })}>
              <option value="unread">Unread</option><option value="read">Read</option><option value="replied">Replied</option><option value="archived">Archived</option>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
