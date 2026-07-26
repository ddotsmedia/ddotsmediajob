'use client';

import { Loader2, MousePointerClick, FileText, CheckCircle2, TrendingUp } from 'lucide-react';
import { trpc } from '@/trpc/react';

const COLORS: Record<string, string> = { whatsapp: '#25D366', apply_button: '#2a9aa4', email: '#E8622A', external_link: '#8DC63F' };
const color = (k: string) => COLORS[k] ?? '#94a3b8';

export default function CtaFunnelPage() {
  const q = trpc.admin.ctaAnalytics.funnel.useQuery({ days: 30 });
  if (q.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>;
  const d = q.data;
  const series = d?.time_series ?? [];
  const maxSeries = Math.max(1, ...series.map((s) => Math.max(s.clicks, s.completed)));

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-navy-900"><TrendingUp className="h-6 w-6 text-teal-500" /> CTA Funnel</h1>
        <p className="text-sm text-navy-700/60">External clicks vs completed applications (last 30 days). Clicks are not applications.</p>
      </div>

      {/* Funnel stages */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stage icon={MousePointerClick} label="CTA clicks" value={d?.total_clicks ?? 0} />
        <Stage icon={FileText} label="Applies started" value={d?.applies_started ?? 0} />
        <Stage icon={CheckCircle2} label="Applies completed" value={d?.applies_completed ?? 0} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Rate label="Click → apply" pct={d?.conversion_rates.clickToApply ?? 0} />
        <Rate label="Started → completed" pct={d?.conversion_rates.applyToCompletion ?? 0} />
      </div>

      {/* By CTA type */}
      <Card title="By CTA type">
        {d?.by_cta_type.length ? <Bars rows={d.by_cta_type.map((r) => ({ label: r.cta_type, n: r.n }))} /> : <Empty />}
      </Card>

      {/* By source page */}
      <Card title="By source page">
        {d?.by_source_page.length ? <Bars rows={d.by_source_page.map((r) => ({ label: r.source_page, n: r.n }))} /> : <Empty />}
      </Card>

      {/* Time series */}
      <Card title="Daily clicks vs completed applications">
        {series.length === 0 ? <Empty /> : (
          <>
            <svg viewBox="0 0 320 120" className="h-32 w-full" preserveAspectRatio="none">
              <polyline fill="none" stroke="#2a9aa4" strokeWidth={2} points={series.map((s, i) => `${(i / Math.max(1, series.length - 1)) * 320},${120 - (s.clicks / maxSeries) * 116 - 2}`).join(' ')} />
              <polyline fill="none" stroke="#8DC63F" strokeWidth={2} points={series.map((s, i) => `${(i / Math.max(1, series.length - 1)) * 320},${120 - (s.completed / maxSeries) * 116 - 2}`).join(' ')} />
            </svg>
            <div className="mt-2 flex gap-4 text-xs"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal-500" /> clicks</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#8DC63F]" /> completed applies</span></div>
          </>
        )}
      </Card>
    </div>
  );
}

function Stage({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return <div className="rounded-2xl border bg-white p-4"><div className="flex items-center gap-1.5 text-xs text-navy-700/60"><Icon className="h-3.5 w-3.5 text-teal-500" /> {label}</div><div className="mt-1 font-display text-2xl font-bold text-navy-900">{value.toLocaleString()}</div></div>;
}
function Rate({ label, pct }: { label: string; pct: number }) {
  return <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-navy-700/60">{label}</div><div className="mt-1 font-display text-xl font-bold text-teal-700">{pct}%</div></div>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border bg-white p-5"><h2 className="font-display font-bold text-navy-900">{title}</h2><div className="mt-4">{children}</div></div>;
}
function Bars({ rows }: { rows: { label: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate capitalize text-navy-800">{r.label.replace(/_/g, ' ')}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-navy-50"><div className="h-full rounded" style={{ width: `${(r.n / max) * 100}%`, background: color(r.label) }} /></div>
          <span className="w-12 shrink-0 text-right tabular-nums text-navy-700/70">{r.n}</span>
        </div>
      ))}
    </div>
  );
}
const Empty = () => <p className="py-6 text-center text-sm text-navy-700/50">No data yet.</p>;
