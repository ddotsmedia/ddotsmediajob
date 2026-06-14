'use client';

import { useState } from 'react';
import { ShieldAlert, Loader2, Ban, Check } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Badge } from '@/components/ui/primitives';
import { downloadCsv } from '@/lib/csv';

const SEV: Record<string, 'muted' | 'gold' | 'urgent'> = { info: 'muted', warn: 'gold', error: 'urgent', critical: 'urgent' };

export default function SecurityPage() {
  const utils = trpc.useUtils();
  const data = trpc.admin.securityOverview.useQuery();
  const block = trpc.admin.blockIp.useMutation({ onSuccess: () => { utils.admin.securityOverview.invalidate(); toast.success('IP blocked'); }, onError: (e) => toast.error(e.message) });
  const unblock = trpc.admin.unblockIp.useMutation({ onSuccess: () => { utils.admin.securityOverview.invalidate(); toast.success('IP unblocked'); }, onError: (e) => toast.error(e.message) });
  const [ip, setIp] = useState('');

  const recent = data.data?.recent ?? [];
  const counts = (ev: string) => data.data?.byEvent.find((e) => e.label === ev)?.value ?? 0;

  function exportCsv() {
    if (!recent.length) return toast.error('No logs to export');
    downloadCsv('security-logs.csv', recent.map((r) => ({ event: r.event, severity: r.severity, ip: r.ip ?? '', userId: r.userId ?? '', at: new Date(r.createdAt).toISOString(), metadata: JSON.stringify(r.metadata ?? {}) })));
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Security</h1></div>
      <p className="text-navy-700/60">Last 24h events. IP blocking is {data.data?.blockingEnabled ? <span className="font-semibold text-green-600">ON</span> : <span className="font-semibold text-navy-500">OFF (set ENABLE_IP_BLOCKING=true)</span>}.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Failed logins" value={counts('FAILED_LOGIN')} />
        <Stat label="Rate-limit hits" value={counts('RATE_LIMIT_HIT')} />
        <Stat label="IDOR attempts" value={counts('IDOR_ATTEMPT')} accent />
        <Stat label="Webhooks" value={counts('WEBHOOK_RECEIVED')} />
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="font-display text-sm font-bold text-navy-900">Block / unblock IP</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="e.g. 203.0.113.5" className="w-56" />
          <Button size="sm" onClick={() => ip && block.mutate({ ip, hours: 24 })} disabled={block.isPending}><Ban className="h-4 w-4" /> Block 24h</Button>
          <Button size="sm" variant="outline" onClick={() => ip && unblock.mutate({ ip })} disabled={unblock.isPending}><Check className="h-4 w-4" /> Unblock</Button>
        </div>
        {!data.data?.blockingEnabled && <p className="mt-2 text-xs text-navy-700/50">Blocks are recorded but only enforced when ENABLE_IP_BLOCKING=true.</p>}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-navy-900">Recent events</h2>
        <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        {data.isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-500" /></div> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-navy-50/60 text-left text-xs font-semibold text-navy-700"><tr><th className="px-3 py-2">Event</th><th className="px-3 py-2">Severity</th><th className="px-3 py-2">IP</th><th className="px-3 py-2">When</th></tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium text-navy-900">{r.event}</td>
                  <td className="px-3 py-2"><Badge variant={SEV[r.severity] ?? 'muted'}>{r.severity}</Badge></td>
                  <td className="px-3 py-2 text-navy-700/70">{r.ip ?? '—'}</td>
                  <td className="px-3 py-2 text-navy-700/50">{new Date(r.createdAt).toLocaleString('en-AE')}</td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-navy-700/50">No events.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return <div className={`rounded-xl border p-4 text-center ${accent && value > 0 ? 'border-red-200 bg-red-50' : 'bg-white'}`}><p className="font-display text-2xl font-bold text-navy-900">{value}</p><p className="text-xs text-navy-700/60">{label}</p></div>;
}
