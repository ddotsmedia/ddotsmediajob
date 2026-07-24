import Link from 'next/link';
import { AlertTriangle, TrendingUp, Banknote } from 'lucide-react';
import { SalarySubmitForm } from '@/components/salary-submit-form';
import { SALARY_ROLES } from '@/config/salary-roles';

type Agg = {
  normalizedJobTitle: string; emirate: string; experienceLevel: string; count: number;
  medianAed: number | null; averageAed: number | null; minAed: number | null; maxAed: number | null;
  percentile25: number | null; percentile75: number | null;
};
type Recent = { jobTitle: string; emirate: string | null; experienceLevel: string; monthlySalaryAed: number; createdAt: string | Date };

const aed = (n: number | null | undefined) => (n && n > 0 ? `AED ${n.toLocaleString('en-AE')}` : '—');

export function SalaryReport({
  title, roleSlug, emirateName, aggregates, totalCount, recent,
}: {
  title: string; roleSlug: string; emirateName?: string; aggregates: Agg[]; totalCount: number; recent: Recent[];
}) {
  const overallMedian = aggregates.length ? Math.round(aggregates.reduce((a, r) => a + (r.medianAed ?? 0) * r.count, 0) / Math.max(1, totalCount)) : null;
  const overallAvg = aggregates.length ? Math.round(aggregates.reduce((a, r) => a + (r.averageAed ?? 0) * r.count, 0) / Math.max(1, totalCount)) : null;
  const min = aggregates.reduce<number | null>((m, r) => (r.minAed != null && (m == null || r.minAed < m) ? r.minAed : m), null);
  const max = aggregates.reduce<number | null>((m, r) => (r.maxAed != null && (m == null || r.maxAed > m) ? r.maxAed : m), null);
  const similar = SALARY_ROLES.filter((r) => r.slug !== roleSlug).slice(0, 6);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-xs text-navy-700/50"><Link href="/salaries" className="hover:underline">Salaries</Link> › <Link href={`/salaries/${roleSlug}`} className="hover:underline">{title}</Link>{emirateName ? ` › ${emirateName}` : ''}</nav>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy-900 sm:text-3xl">{title} Salary in {emirateName ?? 'the UAE'}</h1>

      {totalCount < 5 && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Based on {totalCount} submission{totalCount === 1 ? '' : 's'} — treat as indicative. Add yours to improve accuracy.
        </p>
      )}

      {overallMedian ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat icon={Banknote} label="Median (monthly)" value={aed(overallMedian)} />
          <Stat icon={TrendingUp} label="Average (monthly)" value={aed(overallAvg)} />
          <Stat icon={Banknote} label="Range" value={`${aed(min)} – ${aed(max)}`} />
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-navy-700/60">No salary data yet for this role. Be the first to share below.</p>
      )}

      {aggregates.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b text-left text-xs text-navy-700/60"><th className="p-3">Level</th>{!emirateName && <th>Emirate</th>}<th className="text-right">Median</th><th className="text-right">25th–75th</th><th className="text-right">Submissions</th></tr></thead>
            <tbody>
              {aggregates.map((r) => (
                <tr key={`${r.emirate}-${r.experienceLevel}`} className="border-b last:border-0">
                  <td className="p-3 font-medium capitalize text-navy-900">{r.experienceLevel}</td>
                  {!emirateName && <td className="capitalize text-navy-700/80">{r.emirate}</td>}
                  <td className="text-right tabular-nums">{aed(r.medianAed)}</td>
                  <td className="text-right tabular-nums text-navy-700/70">{aed(r.percentile25)} – {aed(r.percentile75)}</td>
                  <td className="text-right tabular-nums text-navy-700/60">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8"><SalarySubmitForm defaultTitle={title} defaultEmirate={emirateName ?? ''} /></div>

      {recent.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display font-bold text-navy-900">Recently submitted</h2>
          <ul className="mt-2 divide-y rounded-2xl border bg-white text-sm">
            {recent.slice(0, 8).map((r, i) => (
              <li key={i} className="flex items-center justify-between p-3">
                <span className="min-w-0 truncate text-navy-800">{r.jobTitle}{r.emirate ? ` · ${r.emirate}` : ''} · <span className="capitalize text-navy-700/60">{r.experienceLevel}</span></span>
                <span className="shrink-0 font-semibold tabular-nums text-navy-900">{aed(r.monthlySalaryAed)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-display font-bold text-navy-900">Salaries for similar roles</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {similar.map((r) => <Link key={r.slug} href={`/salaries/${r.slug}`} className="rounded-full border px-3 py-1.5 text-sm text-navy-700 hover:border-teal-400 hover:bg-teal-50">{r.name}</Link>)}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs text-navy-700/60"><Icon className="h-3.5 w-3.5 text-teal-500" /> {label}</div>
      <div className="mt-1 font-display text-lg font-bold text-navy-900">{value}</div>
    </div>
  );
}
