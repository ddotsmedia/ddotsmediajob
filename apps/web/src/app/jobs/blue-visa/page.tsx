import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';
import { ToolHero } from '@/components/tools/tool-hero';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'UAE Blue Visa Jobs — Long-Term Residency Roles',
  description: 'Jobs in the UAE that support the Blue Visa — the 10-year residency for professionals contributing to environmental and sustainability work. Visa-sponsored roles updated daily.',
  alternates: { canonical: `${SITE.url}/jobs/blue-visa` },
};

export default async function Page() {
  const api = await getApi();
  const { jobs, total } = await api.jobs.list({ visaProvided: true, sort: 'newest', page: 1, perPage: 24 } as never).catch(() => ({ jobs: [] as never[], total: 0 }));

  return (
    <div className="bg-navy-50/30">
      <ToolHero title="UAE Blue Visa Jobs" subtitle={`${total.toLocaleString('en-AE')} visa-sponsored roles. The Blue Visa is a 10-year UAE residency for professionals in environment and sustainability.`} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-xl border bg-white p-5 text-sm text-navy-700/80">
          The <strong>Blue Visa</strong> grants 10-year UAE residency to individuals making outstanding contributions to environmental protection and sustainability — in the UAE or abroad. Employers offering visa sponsorship are listed below.{' '}
          <Link href="/visa-guide" className="font-semibold text-teal-600 hover:underline">Read the full UAE visa guide →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
        {jobs.length === 0 && <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">No visa-sponsored jobs right now. <Link href="/jobs" className="text-teal-600 hover:underline">Browse all jobs</Link>.</p>}
      </div>
    </div>
  );
}
