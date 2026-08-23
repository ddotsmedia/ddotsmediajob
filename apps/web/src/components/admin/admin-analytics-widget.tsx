'use client';

import { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';

const RANGES = [7, 14, 30, 90] as const;
type Range = (typeof RANGES)[number];

// Brand teal for jobs, navy for applications — distinguishable in greyscale too.
const JOBS = '#2a9aa4';
const APPS = '#0f172a';

type Delta = { current: number; previous: number; changePct: number | null; direction: 'up' | 'down' | 'flat' };

/**
 * One KPI with its period-over-period change.
 *
 * A null changePct means the previous period was zero — shown as "new" rather
 * than a percentage, because "+∞%" or "+500%" from a zero baseline misleads.
 */
function Kpi({ label, d, suffix = '' }: { label: string; d: Delta; suffix?: string }) {
  const Icon = d.direction === 'up' ? TrendingUp : d.direction === 'down' ? TrendingDown : Minus;
  // Direction is not sentiment: more jobs is good, and this widget has no
  // metric where "up" is bad, so up = green is safe here.
  const tone =
    d.direction === 'up' ? 'text-green-700' : d.direction === 'down' ? 'text-red-700' : 'text-navy-700/50';

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-navy-700/60">{label}</div>
      <div className="mt-1 font-display text-2xl font-extrabold text-navy-900">
        {d.current.toLocaleString()}
        {suffix}
      </div>
      <div className={`mt-1 flex items-center gap-1 text-xs ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
        {d.changePct === null ? (
          <span>{d.current > 0 ? 'new this period' : 'no activity'}</span>
        ) : (
          <span>
            {d.changePct > 0 ? '+' : ''}
            {d.changePct}% vs previous {d.previous.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

function Rate({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-navy-700/60">{label}</div>
      <div className="mt-1 font-display text-2xl font-extrabold text-navy-900">
        {/* null = nothing measured yet, which is not the same as 0. */}
        {value === null ? <span className="text-navy-700/30">—</span> : `${value}%`}
      </div>
      <div className="mt-1 text-xs text-navy-700/50">{hint}</div>
    </div>
  );
}

/**
 * Trends for the admin dashboard: how jobs, applications and signups are moving,
 * rather than the current-state counts the rest of the dashboard already shows.
 */
export function AdminAnalyticsWidget() {
  const [days, setDays] = useState<Range>(30);
  const q = trpc.admin.analyticsTrends.useQuery({ days }, { staleTime: 60_000 });

  return (
    <section aria-labelledby="analytics-trends-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="analytics-trends-title" className="font-display text-sm font-bold text-navy-900">
          Trends — last {days} days
        </h2>
        <div className="flex gap-1" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                days === r ? 'bg-teal-600 text-white' : 'border text-navy-700 hover:bg-navy-50'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <div className="rounded-xl border bg-white p-6">
          <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
        </div>
      ) : q.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load trends: {q.error.message}
        </div>
      ) : q.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Jobs posted" d={q.data.kpis.jobs} />
            <Kpi label="Applications" d={q.data.kpis.applications} />
            <Kpi label="New users" d={q.data.kpis.users} />
            <Rate label="Approval rate" value={q.data.approvalRate} hint="of jobs decided this period" />
            <div className="rounded-xl border bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-navy-700/60">Apps per job</div>
              <div className="mt-1 font-display text-2xl font-extrabold text-navy-900">
                {q.data.appsPerJob === null ? <span className="text-navy-700/30">—</span> : q.data.appsPerJob}
              </div>
              <div className="mt-1 text-xs text-navy-700/50">demand per listing</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border bg-white p-4">
            {/* Fixed height: ResponsiveContainer needs a sized parent or it collapses to 0. */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={q.data.series} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={JOBS} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={JOBS} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={APPS} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={APPS} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    // A 90-day axis cannot fit 90 labels; thin them out.
                    interval={Math.max(0, Math.floor(q.data.series.length / 8) - 1)}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} width={40} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="jobs" name="Jobs posted" stroke={JOBS} fill="url(#gJobs)" strokeWidth={2} />
                  <Area type="monotone" dataKey="applications" name="Applications" stroke={APPS} fill="url(#gApps)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
