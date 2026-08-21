'use client';

import { useState } from 'react';
import { Loader2, ArrowRight, Download } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Input, Select, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

// Windows the viewer can scope to. Undefined = everything.
const RANGES: { label: string; hours?: number }[] = [
  { label: 'All time' },
  { label: 'Last 24 hours', hours: 24 },
  { label: 'Last 7 days', hours: 24 * 7 },
  { label: 'Last 30 days', hours: 24 * 30 },
];

/** Actions that destroy or escalate — worth spotting at a glance in a long feed. */
const isDestructive = (action: string) => /delete|ban|reject|remove/i.test(action);
const isElevating = (action: string) => /role|2fa|verify|approve|publish/i.test(action);

function actionTone(action: string) {
  if (isDestructive(action)) return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  if (isElevating(action)) return 'bg-green-50 text-green-700 ring-1 ring-green-200';
  return 'bg-navy-100 text-navy-700';
}

/** Renders a primitive audit value without turning null/undefined into "null". */
function Value({ v }: { v: unknown }) {
  if (v === null || v === undefined || v === '') return <span className="text-navy-700/30">empty</span>;
  if (typeof v === 'boolean') return <span className="font-mono">{v ? 'true' : 'false'}</span>;
  if (typeof v === 'object') return <span className="font-mono">{JSON.stringify(v)}</span>;
  return <span className="font-mono">{String(v)}</span>;
}

type FieldDiff = { from: unknown; to: unknown };

/** meta.changes → a field-level from → to table. */
function ChangeTable({ changes }: { changes: Record<string, FieldDiff> }) {
  return (
    <table className="mt-2 w-full text-[11px]">
      <tbody>
        {Object.entries(changes).map(([field, d]) => (
          <tr key={field} className="align-top">
            <td className="py-0.5 pr-3 font-semibold text-navy-800">{field}</td>
            <td className="py-0.5 pr-2 text-red-700 line-through decoration-red-300"><Value v={d.from} /></td>
            <td className="py-0.5 pr-2 text-navy-700/40"><ArrowRight className="h-3 w-3" /></td>
            <td className="py-0.5 text-green-700"><Value v={d.to} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Whole-row snapshot recorded for a create or a delete. */
function SnapshotTable({ row, tone }: { row: Record<string, unknown>; tone: 'red' | 'green' }) {
  return (
    <table className="mt-2 w-full text-[11px]">
      <tbody>
        {Object.entries(row).map(([field, v]) => (
          <tr key={field} className="align-top">
            <td className="py-0.5 pr-3 font-semibold text-navy-800">{field}</td>
            <td className={`py-0.5 ${tone === 'red' ? 'text-red-700' : 'text-green-700'}`}><Value v={v} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * A log entry's detail. `changes` (an update), `deleted`/`created` (a whole-row
 * snapshot) get structured views; anything else falls back to raw JSON.
 */
function MetaCell({ meta }: { meta: Record<string, unknown> | null }) {
  if (!meta || Object.keys(meta).length === 0) return <span className="text-navy-700/30">—</span>;

  const { changes, deleted, created, ...rest } = meta as {
    changes?: Record<string, FieldDiff>;
    deleted?: Record<string, unknown>;
    created?: Record<string, unknown>;
  } & Record<string, unknown>;

  const changedFields = changes ? Object.keys(changes) : [];
  const summary = changedFields.length
    ? `${changedFields.length} field${changedFields.length > 1 ? 's' : ''} changed`
    : deleted
      ? 'Deleted record'
      : created
        ? 'Created record'
        : 'Details';

  return (
    <details className="max-w-lg">
      <summary className="cursor-pointer text-teal-700 hover:underline">
        {summary}
        {changedFields.length > 0 && (
          <span className="ml-2 font-normal text-navy-700/50">{changedFields.slice(0, 3).join(', ')}{changedFields.length > 3 ? '…' : ''}</span>
        )}
      </summary>
      <div className="mt-1 overflow-x-auto rounded bg-navy-50 p-2">
        {changes && <ChangeTable changes={changes} />}
        {deleted && <SnapshotTable row={deleted} tone="red" />}
        {created && <SnapshotTable row={created} tone="green" />}
        {Object.keys(rest).length > 0 && (
          <pre className="mt-2 overflow-x-auto text-[11px] text-navy-800">{JSON.stringify(rest, null, 2)}</pre>
        )}
      </div>
    </details>
  );
}

export default function AuditLogPage() {
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [actor, setActor] = useState('');
  const [rangeIdx, setRangeIdx] = useState(0);

  // Entity/action options come from what the log actually contains, so the
  // dropdown can never drift from the actions the mutations emit.
  const facets = trpc.admin.auditActions.useQuery();

  const range = RANGES[rangeIdx]!;
  const since = range.hours ? new Date(Date.now() - range.hours * 3600_000) : undefined;

  const logs = trpc.admin.auditLog.useQuery({
    action: action || undefined,
    entity: entity || undefined,
    actor: actor || undefined,
    since,
    limit: 200,
  });
  const rows = logs.data ?? [];
  const filtered = !!(action || entity || actor || since);

  function exportCsv() {
    const head = ['Time', 'Admin', 'Action', 'Entity', 'EntityId', 'IP', 'UserAgent', 'Details'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((l) =>
      [new Date(l.createdAt).toISOString(), l.actorEmail ?? 'system', l.action, l.entity ?? '', l.entityId ?? '', l.ip ?? '', l.userAgent ?? '', JSON.stringify(l.meta ?? {})]
        .map(esc)
        .join(','),
    );
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Audit Log</h1>
      <p className="text-navy-700/60">Every administrative action — who, what, when, and what changed. Append-only.</p>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Input className="w-52" placeholder="Action contains… (e.g. delete)" value={action} onChange={(e) => setAction(e.target.value)} />
        <Input className="w-52" placeholder="Admin email contains…" value={actor} onChange={(e) => setActor(e.target.value)} />
        <Select className="w-44" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All entities</option>
          {(facets.data?.entities ?? []).map((en) => <option key={en} value={en}>{en}</option>)}
        </Select>
        <Select className="w-40" value={rangeIdx} onChange={(e) => setRangeIdx(Number(e.target.value))}>
          {RANGES.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
        </Select>
        {filtered && (
          <Button variant="outline" onClick={() => { setAction(''); setEntity(''); setActor(''); setRangeIdx(0); }}>Clear</Button>
        )}
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {logs.isLoading ? (
          <Loader2 className="m-6 animate-spin text-teal-500" />
        ) : (
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-navy-50 text-left text-navy-700">
              <tr>
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Admin</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Entity</th>
                <th className="px-5 py-3 font-semibold">Changes</th>
                <th className="px-5 py-3 font-semibold">Origin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((log) => (
                <tr key={log.id} className="border-b align-top last:border-0 hover:bg-teal-50/40">
                  <td className="whitespace-nowrap px-5 py-3 text-navy-700/60" title={new Date(log.createdAt).toLocaleString()}>
                    {timeAgo(log.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-navy-700/80">{log.actorEmail ?? <span className="text-navy-700/40">system</span>}</td>
                  <td className="px-5 py-3">
                    <Badge className={`font-mono text-[11px] ${actionTone(log.action)}`}>{log.action}</Badge>
                  </td>
                  <td className="px-5 py-3 text-navy-700/70">
                    {log.entity ?? '—'}
                    {log.entityId && <span className="block font-mono text-[11px] text-navy-700/40">{log.entityId.slice(0, 8)}</span>}
                  </td>
                  <td className="px-5 py-3"><MetaCell meta={log.meta} /></td>
                  <td className="px-5 py-3 font-mono text-xs text-navy-700/50" title={log.userAgent ?? undefined}>
                    {log.ip ?? '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-navy-700/60">
                    No audit entries{filtered ? ' match these filters' : ' yet'}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {rows.length > 0 && (
        <p className="mt-2 px-1 text-xs text-navy-700/50">
          {rows.length} most recent {rows.length === 1 ? 'entry' : 'entries'}
          {filtered ? ' (filtered)' : ''} · hover an IP to see the user agent
        </p>
      )}
    </div>
  );
}
