import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { emirateBySlug } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { SalaryReport } from '@/components/salary-report';
import { slugToNormalized, roleNameFromSlug } from '@/config/salary-roles';

type Props = { params: Promise<{ role: string; emirate: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role, emirate } = await params;
  const em = emirateBySlug(emirate);
  const name = roleNameFromSlug(role);
  if (!em) return { title: 'Salary not found', robots: { index: false } };
  const api = await getApi();
  const { totalCount } = await api.salary.getAggregates({ title: slugToNormalized(role), emirate: em.name });
  return {
    title: { absolute: `${name} Salary in ${em.name} 2026 — by Experience Level | DdotsMediaJobs` },
    description: `${name} salaries in ${em.name}, UAE by experience level. Median, average and percentile ranges from real submissions.`,
    alternates: { canonical: `/salaries/${role}/${emirate}` },
    robots: totalCount < 3 ? { index: false, follow: true } : undefined,
  };
}

export default async function RoleEmirateSalaryPage({ params }: Props) {
  const { role, emirate } = await params;
  const em = emirateBySlug(emirate);
  if (!em) notFound();
  const api = await getApi();
  const [{ aggregates, totalCount }, recent] = await Promise.all([
    api.salary.getAggregates({ title: slugToNormalized(role), emirate: em.name }),
    api.salary.recent(),
  ]);
  return <SalaryReport title={roleNameFromSlug(role)} roleSlug={role} emirateName={em.name} aggregates={aggregates} totalCount={totalCount} recent={recent} />;
}
