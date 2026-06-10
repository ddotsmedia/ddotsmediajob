import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@ddots/auth';
import { CATEGORIES, categoryBySlug, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Card, CardContent } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'UAE Salary Guide 2026 — Average Salaries by Role & Emirate',
  description: 'UAE salary data for 50+ roles across all emirates. Driver, nurse, accountant, engineer, IT salaries in Dubai, Abu Dhabi, Sharjah 2026.',
  alternates: { canonical: `${SITE.url}/salary-guide` },
};

export default async function SalaryGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const api = await getApi();
  const [vis, session] = await Promise.all([api.content.pageVisibility().catch(() => null), auth()]);
  if (vis && !vis.salary_guide_visible && session?.user?.role !== 'admin') notFound();
  const rows = await api.content.salaryGuide(category ? { category } : undefined).catch(() => []);

  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">UAE Salary Guide 2026</h1>
          <p className="mt-2 max-w-2xl text-navy-100/70">
            Average monthly salaries in AED for popular roles across the UAE, based on crowd-sourced reports.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/salary-guide"
            className={`rounded-full border px-4 py-1.5 text-sm ${!category ? 'border-teal-500 bg-teal-500 text-white' : 'bg-white text-navy-700 hover:border-teal-300'}`}
          >
            All
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/salary-guide?category=${c.slug}`}
              className={`rounded-full border px-4 py-1.5 text-sm ${category === c.slug ? 'border-teal-500 bg-teal-500 text-white' : 'bg-white text-navy-700 hover:border-teal-300'}`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-navy-50 text-left text-navy-700">
                <tr>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 text-right font-semibold">Min</th>
                  <th className="px-5 py-3 text-right font-semibold">Average</th>
                  <th className="px-5 py-3 text-right font-semibold">Max</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.jobTitle}-${i}`} className="border-b last:border-0 hover:bg-navy-50/40">
                    <td className="px-5 py-3 font-semibold text-navy-900">{r.jobTitle}</td>
                    <td className="px-5 py-3 text-navy-700/70">{categoryBySlug(r.categorySlug ?? '')?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-navy-700">AED {r.minSalary.toLocaleString('en-AE')}</td>
                    <td className="px-5 py-3 text-right font-bold text-teal-700">AED {r.avgSalary.toLocaleString('en-AE')}</td>
                    <td className="px-5 py-3 text-right text-navy-700">AED {r.maxSalary.toLocaleString('en-AE')}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-navy-700/60">No salary data for this category yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <p className="mt-4 text-xs text-navy-700/50">
          Figures are indicative monthly gross salaries in AED. Have data to share?{' '}
          <Link href="/dashboard" className="text-teal-600 hover:underline">Contribute your salary anonymously</Link>.
        </p>
      </div>
    </div>
  );
}
