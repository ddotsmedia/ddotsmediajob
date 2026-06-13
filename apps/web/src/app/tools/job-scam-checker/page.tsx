'use client';

import { useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const RISK = {
  safe: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', label: 'Looks safe' },
  caution: { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Be cautious' },
  scam: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50', label: 'Likely scam' },
} as const;

export default function ScamCheckerPage() {
  const [text, setText] = useState('');
  const check = trpc.communityHub.checkJobScam.useMutation({ onError: (e) => toast.error(e.message) });
  const report = trpc.communityHub.reportScam.useMutation({ onSuccess: () => toast.success('Reported to admin. Thank you.') });
  const r = check.data;
  const risk = r ? RISK[(r.risk as keyof typeof RISK) ?? 'caution'] ?? RISK.caution : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-navy-900">UAE job scam checker</h1>
      <p className="mt-1 text-navy-700/60">Paste any job message from WhatsApp. Our AI checks it for scam warning signs. We never store your text unless you report it.</p>

      <Textarea className="mt-5 min-h-[160px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the job message here…" />
      <Button className="mt-3" onClick={() => check.mutate({ text })} disabled={check.isPending || text.trim().length < 15}>
        {check.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Check this job
      </Button>

      {r && risk && (
        <div className={cn('mt-6 rounded-xl border p-5', risk.bg)}>
          <div className="flex items-center gap-2">
            <risk.icon className={cn('h-7 w-7', risk.color)} />
            <div><p className={cn('font-display text-lg font-bold', risk.color)}>{risk.label}</p><p className="text-xs text-navy-700/60">Risk score: {r.score}/100</p></div>
          </div>
          {r.flags.length > 0 && (
            <ul className="mt-3 space-y-1">{r.flags.map((f, i) => <li key={i} className="text-sm text-navy-700/80">⚠ {f}</li>)}</ul>
          )}
          <p className="mt-3 text-sm font-medium text-navy-800">{r.recommendation}</p>
          <Button className="mt-4" size="sm" variant="outline" onClick={() => report.mutate({ text, source: 'scam-checker', riskScore: r.score, flags: r.flags })} disabled={report.isPending}>
            <Flag className="h-4 w-4" /> Report this job
          </Button>
        </div>
      )}
    </div>
  );
}
