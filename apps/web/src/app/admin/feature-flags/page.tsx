'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Flag } from 'lucide-react';
import { trpc } from '@/trpc/react';

type FlagRow = { key: string; name: string; description: string | null; enabled: boolean; rolloutPercent: number };

export default function AdminFeatureFlagsPage() {
  const utils = trpc.useUtils();
  const flags = trpc.admin.featureFlags.getAll.useQuery();
  const toggle = trpc.admin.featureFlags.toggle.useMutation({
    onSuccess: () => { utils.admin.featureFlags.getAll.invalidate(); toast.success('Flag updated'); },
    onError: (e) => toast.error(e.message),
  });
  const setRollout = trpc.admin.featureFlags.updateRollout.useMutation({
    onSuccess: () => { utils.admin.featureFlags.getAll.invalidate(); toast.success('Rollout updated'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-navy-900"><Flag className="h-6 w-6 text-teal-500" /> Feature Flags</h1>
      <p className="text-sm text-navy-700/60">Toggle features and control percentage rollout. Changes apply within ~30s (cache).</p>

      {flags.isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
      ) : (
        <div className="mt-4 space-y-3">
          {(flags.data ?? []).map((f) => <FlagCard key={f.key} flag={f} onToggle={(enabled) => toggle.mutate({ key: f.key, enabled, rolloutPercent: f.rolloutPercent })} onRollout={(rolloutPercent) => setRollout.mutate({ key: f.key, rolloutPercent })} busy={toggle.isPending || setRollout.isPending} />)}
        </div>
      )}
    </div>
  );
}

function FlagCard({ flag, onToggle, onRollout, busy }: { flag: FlagRow; onToggle: (enabled: boolean) => void; onRollout: (pct: number) => void; busy: boolean }) {
  const [pct, setPct] = useState(flag.rolloutPercent);
  return (
    <div className={`rounded-2xl border bg-white p-4 ${flag.enabled ? 'border-green-200' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold text-navy-900">{flag.name}</p>
          {flag.description && <p className="text-sm text-navy-700/60">{flag.description}</p>}
          <code className="text-xs text-navy-700/40">{flag.key}</code>
        </div>
        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={flag.enabled}
          aria-label={`Toggle ${flag.name}`}
          disabled={busy}
          onClick={() => onToggle(!flag.enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${flag.enabled ? 'bg-green-500' : 'bg-navy-200'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${flag.enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs text-navy-700/60">Rollout</span>
        <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} onMouseUp={() => onRollout(pct)} onTouchEnd={() => onRollout(pct)} className="flex-1 accent-teal-600" aria-label={`${flag.name} rollout percent`} disabled={busy} />
        <span className="w-10 text-right text-sm font-bold tabular-nums text-navy-900">{pct}%</span>
      </div>
    </div>
  );
}
