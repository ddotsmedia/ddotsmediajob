'use client';

import { Loader2, DollarSign, Cpu, Timer, PieChart } from 'lucide-react';
import { trpc } from '@/trpc/react';

const COLORS: Record<string, string> = { gemini: '#2a9aa4', anthropic: '#E8622A', 'pdf-fallback': '#94a3b8', none: '#cbd5e1' };
const color = (m: string) => COLORS[m] ?? '#0f172a';
const usd = (n: number) => `$${n.toFixed(n < 1 ? 5 : 2)}`;

export default function CvAnalyticsPage() {
  const q = trpc.cvMetrics.dashboard.useQuery({ days: 30 });

  if (q.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>;

  const d = q.data;
  const daily = d?.daily ?? [];
  const breakdown = d?.breakdown ?? [];
  const recent = d?.recent ?? [];
  const dates = [...new Set(daily.map((r) => r.date))].sort();
  const models = [...new Set(daily.map((r) => r.model))];
  const val = (date: string, model: string, key: 'tokens_out' | 'avg_latency') => daily.find((r) => r.date === date && r.model === model)?.[key] ?? 0;
  const totalParses = breakdown.reduce((a, b) => a + b.cnt, 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">CV Parse Cost Analytics</h1>
        <p className="text-sm text-navy-700/60">AI resume-parse spend, tokens, latency and model mix (last 30 days).</p>
      </div>

      {/* a) Cost summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat icon={DollarSign} label="Total cost (YTD)" value={usd(d?.summary.totalCostYtd ?? 0)} />
        <Stat icon={Cpu} label="Parses (YTD)" value={String(d?.summary.count ?? 0)} />
        <Stat icon={DollarSign} label="Daily avg" value={usd(d?.summary.dailyAvg ?? 0)} />
        <Stat icon={DollarSign} label="Monthly projection" value={usd(d?.summary.monthlyProjection ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* b) Token usage line chart */}
        <Card title="Tokens out per day" icon={Cpu}>
          {dates.length === 0 ? <Empty /> : (
            <LineChart dates={dates} series={models.map((m) => ({ model: m, points: dates.map((dt) => val(dt, m, 'tokens_out')) }))} />
          )}
          <Legend models={models} />
        </Card>

        {/* d) Model breakdown donut */}
        <Card title="Model breakdown" icon={PieChart}>
          {totalParses === 0 ? <Empty /> : (
            <div className="flex items-center gap-6">
              <div
                className="h-32 w-32 shrink-0 rounded-full"
                style={{ background: donutGradient(breakdown, totalParses) }}
              >
                <div className="flex h-full w-full items-center justify-center">
                  <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white text-center">
                    <span className="font-display text-lg font-bold text-navy-900">{totalParses}</span>
                    <span className="text-[10px] text-navy-700/60">parses</span>
                  </div>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm">
                {breakdown.map((b) => (
                  <li key={b.model} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm" style={{ background: color(b.model) }} />
                    <span className="font-medium text-navy-800">{b.model}</span>
                    <span className="text-navy-700/60">{Math.round((b.cnt / totalParses) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* c) Latency per model */}
      <Card title="Avg latency per model (ms)" icon={Timer}>
        {daily.length === 0 ? <Empty /> : (
          <div className="space-y-2">
            {models.map((m) => {
              const rows = daily.filter((r) => r.model === m);
              const avg = Math.round(rows.reduce((a, r) => a + r.avg_latency * r.cnt, 0) / Math.max(1, rows.reduce((a, r) => a + r.cnt, 0)));
              const max = Math.max(1, ...models.map((mm) => { const rr = daily.filter((r) => r.model === mm); return rr.reduce((a, r) => a + r.avg_latency * r.cnt, 0) / Math.max(1, rr.reduce((a, r) => a + r.cnt, 0)); }));
              return (
                <div key={m} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 truncate text-navy-800">{m}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-navy-50">
                    <div className="h-full rounded" style={{ width: `${(avg / max) * 100}%`, background: color(m) }} />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums text-navy-700/70">{avg} ms</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* e) Recent 10 parses */}
      <Card title="Recent parses" icon={Cpu}>
        {recent.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b text-left text-xs text-navy-700/60">
                <th className="py-2">Time</th><th>Model</th><th className="text-right">Tokens</th><th className="text-right">Cost</th><th>Error</th>
              </tr></thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 text-navy-700/70">{new Date(r.created_at).toLocaleString('en-AE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td><span className="rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ background: color(r.model) }}>{r.model}</span></td>
                    <td className="text-right tabular-nums">{r.tokens_in + r.tokens_out}</td>
                    <td className="text-right tabular-nums">{usd(r.cost_usd)}</td>
                    <td className="text-xs text-red-600">{r.error_type ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* f) Prompt version */}
      <Card title="Prompt version" icon={Cpu}>
        <p className="text-sm text-navy-800">Current version: <span className="font-bold text-teal-700">v1.0</span></p>
        <ul className="mt-2 space-y-1 text-xs text-navy-700/70">
          <li>• v1.0 — initial extraction schema (skills, experience, location, education) via Gemini Vision, Anthropic + local-pdf fallback.</li>
        </ul>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs text-navy-700/60"><Icon className="h-3.5 w-3.5 text-teal-500" /> {label}</div>
      <div className="mt-1 font-display text-xl font-bold text-navy-900">{value}</div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof DollarSign; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <h2 className="flex items-center gap-2 font-display font-bold text-navy-900"><Icon className="h-4 w-4 text-teal-500" /> {title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

const Empty = () => <p className="py-8 text-center text-sm text-navy-700/50">No data yet.</p>;

function Legend({ models }: { models: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs">
      {models.map((m) => <span key={m} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(m) }} />{m}</span>)}
    </div>
  );
}

/** Minimal multi-series line chart (responsive via viewBox). */
function LineChart({ dates, series }: { dates: string[]; series: { model: string; points: number[] }[] }) {
  const W = 320, H = 120, pad = 4;
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const x = (i: number) => (dates.length <= 1 ? W / 2 : pad + (i / (dates.length - 1)) * (W - pad * 2));
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none">
      {series.map((s) => (
        <polyline key={s.model} fill="none" stroke={color(s.model)} strokeWidth={2} points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      ))}
    </svg>
  );
}

/** conic-gradient donut from model counts. */
function donutGradient(breakdown: { model: string; cnt: number }[], total: number): string {
  let acc = 0;
  const stops = breakdown.map((b) => {
    const start = (acc / total) * 360;
    acc += b.cnt;
    const end = (acc / total) * 360;
    return `${color(b.model)} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}
