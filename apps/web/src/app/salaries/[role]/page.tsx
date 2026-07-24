import type { Metadata } from 'next';
import { getApi } from '@/trpc/server';
import { SalaryReport } from '@/components/salary-report';
import { slugToNormalized, roleNameFromSlug } from '@/config/salary-roles';

type Props = { params: Promise<{ role: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role } = await params;
  const name = roleNameFromSlug(role);
  const api = await getApi();
  const { totalCount } = await api.salary.getAggregates({ title: slugToNormalized(role) });
  return {
    title: { absolute: `${name} Salary in the UAE 2026 — Median, Average & Range | DdotsMediaJobs` },
    description: `${name} salaries in the UAE by experience level and emirate. Median, average and 25th–75th percentile ranges from real submissions.`,
    alternates: { canonical: `/salaries/${role}` },
    // Thin (little/no data) pages should not be indexed until they have real value (audit Phase 11/14).
    robots: totalCount < 3 ? { index: false, follow: true } : undefined,
  };
}

export default async function RoleSalaryPage({ params }: Props) {
  const { role } = await params;
  const api = await getApi();
  const [{ aggregates, totalCount }, recent] = await Promise.all([
    api.salary.getAggregates({ title: slugToNormalized(role) }),
    api.salary.recent(),
  ]);
  const name = roleNameFromSlug(role);

  return (
    <>
      {totalCount >= 3 && aggregates[0]?.medianAed ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Occupation',
              name,
              occupationLocation: { '@type': 'Country', name: 'United Arab Emirates' },
              estimatedSalary: {
                '@type': 'MonetaryAmountDistribution',
                name: 'base',
                currency: 'AED',
                duration: 'P1M',
                median: aggregates[0].medianAed,
                percentile25: aggregates[0].percentile25 ?? undefined,
                percentile75: aggregates[0].percentile75 ?? undefined,
              },
            }),
          }}
        />
      ) : null}
      <SalaryReport title={name} roleSlug={role} aggregates={aggregates} totalCount={totalCount} recent={recent} />
    </>
  );
}
