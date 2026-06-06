import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';
import { ToolHero } from '@/components/tools/tool-hero';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Emiratization Jobs in the UAE — Roles for UAE Nationals',
  description: 'Jobs supporting Emiratization and the Nafis programme. Private-sector roles for UAE nationals with salary support and benefits. Updated daily on DdotsMediaJobs.',
  alternates: { canonical: `${SITE.url}/jobs/emiratization` },
};

export default async function Page() {
  const api = await getApi();
  const { jobs, total } = await api.jobs.list({ sort: 'newest', page: 1, perPage: 24 } as never).catch(() => ({ jobs: [] as never[], total: 0 }));

  return (
    <div className="bg-navy-50/30">
      <ToolHero title="Emiratization Jobs" subtitle={`${total.toLocaleString('en-AE')} live roles. Private-sector employers must grow their UAE national workforce under Nafis — bringing salary top-ups and benefits for Emiratis.`} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-xl border bg-white p-5 text-sm text-navy-700/80">
          <strong>Emiratization</strong> requires private companies with 50+ staff to raise their share of UAE nationals each year. The <strong>Nafis</strong> programme adds salary support, pension top-ups and training for Emiratis joining the private sector.{' '}
          <Link href="/nafis-guide" className="font-semibold text-teal-600 hover:underline">Read the full Nafis & Emiratization guide →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
        {jobs.length === 0 && <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">No jobs right now. <Link href="/jobs" className="text-teal-600 hover:underline">Browse all jobs</Link>.</p>}
      </div>
    </div>
  );
}
