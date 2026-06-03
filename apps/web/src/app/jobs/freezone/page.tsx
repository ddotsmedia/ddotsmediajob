import type { Metadata } from 'next';
import Link from 'next/link';
import { FREE_ZONES, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';
import { ToolHero } from '@/components/tools/tool-hero';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Free Zone Jobs in the UAE — DMCC, DIFC, ADGM, JAFZA',
  description: 'Browse the latest free-zone jobs across the UAE — DMCC, DIFC, ADGM, JAFZA, SHAMS and more. Free-zone visa roles updated daily.',
  alternates: { canonical: `${SITE.url}/jobs/freezone` },
};

export default async function Page() {
  const api = await getApi();
  const { jobs, total } = await api.jobs.list({ freeZone: true, sort: 'newest', page: 1, perPage: 24 } as never).catch(() => ({ jobs: [] as never[], total: 0 }));

  return (
    <div className="bg-navy-50/30">
      <ToolHero title="Free Zone Jobs in the UAE" subtitle={`${total.toLocaleString('en-AE')} roles in DMCC, DIFC, ADGM, JAFZA, SHAMS and other free zones.`} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {FREE_ZONES.slice(0, 10).map((z) => (
            <span key={z.slug} className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-navy-700">{z.name}</span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
        {jobs.length === 0 && (
          <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">No free-zone jobs right now. <Link href="/jobs" className="text-teal-600 hover:underline">Browse all jobs</Link>.</p>
        )}
      </div>
    </div>
  );
}
