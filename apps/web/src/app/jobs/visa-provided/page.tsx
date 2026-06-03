import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';
import { ToolHero } from '@/components/tools/tool-hero';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Visa-Sponsored Jobs in the UAE',
  description: 'Browse UAE jobs that provide visa sponsorship. Employment-visa roles with accommodation and benefits, updated daily.',
  alternates: { canonical: `${SITE.url}/jobs/visa-provided` },
};

export default async function Page() {
  const api = await getApi();
  const { jobs, total } = await api.jobs.list({ visaProvided: true, sort: 'newest', page: 1, perPage: 24 } as never).catch(() => ({ jobs: [] as never[], total: 0 }));

  return (
    <div className="bg-navy-50/30">
      <ToolHero title="Visa-Sponsored Jobs in the UAE" subtitle={`${total.toLocaleString('en-AE')} roles that provide UAE employment visa sponsorship.`} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
        {jobs.length === 0 && <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">No visa-sponsored jobs right now. <Link href="/jobs" className="text-teal-600 hover:underline">Browse all jobs</Link>.</p>}
      </div>
    </div>
  );
}
