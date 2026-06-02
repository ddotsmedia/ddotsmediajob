import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EMIRATES, emirateBySlug, CATEGORIES, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';

export const revalidate = 600;
export const dynamicParams = false;

export function generateStaticParams() {
  return EMIRATES.map((e) => ({ emirate: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ emirate: string }> }): Promise<Metadata> {
  const { emirate: slug } = await params;
  const emirate = emirateBySlug(slug);
  if (!emirate) return { title: 'Emirate not found' };
  const title = `Jobs in ${emirate.name}`;
  return {
    title,
    description: `Find the latest jobs in ${emirate.name}, UAE. Browse vacancies across all industries on ${SITE.name}.`,
    alternates: { canonical: `${SITE.url}/jobs-in/${slug}` },
  };
}

export default async function EmiratePage({ params }: { params: Promise<{ emirate: string }> }) {
  const { emirate: slug } = await params;
  const emirate = emirateBySlug(slug);
  if (!emirate) notFound();

  const api = await getApi();
  const { jobs, total } = await api.jobs
    .list({ emirate: slug, sort: 'newest', page: 1, perPage: 24 } as never)
    .catch(() => ({ jobs: [] as never[], total: 0 }));

  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="font-display text-3xl font-bold text-white">Jobs in {emirate.name}</h1>
          <p className="mt-1 text-navy-100/70">{total.toLocaleString('en-AE')} open positions in {emirate.name}, UAE</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
        {jobs.length === 0 && (
          <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">
            No jobs in {emirate.name} right now. <Link href="/jobs" className="text-teal-600 hover:underline">Browse all jobs</Link>.
          </p>
        )}

        <div className="mt-12 border-t pt-8">
          <h2 className="font-display text-lg font-bold text-navy-900">Popular categories in {emirate.name}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/jobs?emirate=${slug}&category=${c.slug}`}
                className="rounded-full border bg-white px-4 py-1.5 text-sm text-navy-700 hover:border-teal-300 hover:text-teal-600"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {EMIRATES.filter((e) => e.slug !== slug).map((e) => (
            <Link key={e.slug} href={`/jobs-in/${e.slug}`} className="text-sm text-teal-600 hover:underline">
              Jobs in {e.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
