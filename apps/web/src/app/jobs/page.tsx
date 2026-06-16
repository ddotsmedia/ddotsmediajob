import type { Metadata } from 'next';
import Link from 'next/link';
import { jobFilterSchema, computeMatchScore } from '@ddots/shared';
import { auth } from '@ddots/auth';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';
import { JobFilters } from '@/components/job-filters';
import { MobileFilterSheet } from '@/components/mobile-filter-sheet';
import { JobSearchBar } from '@/components/job-search-bar';
import { Pagination } from '@/components/pagination';
import { Select } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const api = await getApi();
  const stats = await api.jobs.stats().catch(() => ({ totalActive: 0 }));
  const n = stats.totalActive;
  return {
    title: { absolute: `UAE Jobs 2026 — ${n ? n.toLocaleString('en-AE') + ' ' : ''}Live Vacancies in Dubai & All Emirates | DdotsMediaJobs` },
    description:
      'Search UAE jobs by category, emirate, salary. Driver, nurse, accountant, IT, engineering jobs. Urgent hiring, walk-in interviews, visa provided jobs UAE.',
  };
}

type SP = Record<string, string | string[] | undefined>;

export default async function JobsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const wantMatch = sp.sort === 'match';
  const filter = jobFilterSchema.parse({ ...sp, sort: wantMatch ? 'newest' : sp.sort });
  const api = await getApi();
  const { jobs, total, page, totalPages } = await api.jobs.list(filter);

  // Logged-in seekers: attach a deterministic match score per card.
  const session = await auth();
  const seeker = session?.user?.role === 'jobseeker' ? await api.jobseekers.me().catch(() => null) : null;
  let cards = jobs as Array<(typeof jobs)[number] & { matchScore?: number }>;
  if (seeker) {
    cards = jobs.map((j) => ({ ...j, matchScore: computeMatchScore(seeker, j) }));
    if (wantMatch) cards = [...cards].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => typeof v === 'string' && params.set(k, v));
    params.set('page', String(p));
    return `/jobs?${params.toString()}`;
  };

  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-8">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Browse Jobs</h1>
          <div className="mt-4 max-w-3xl">
            <JobSearchBar size="md" />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <JobFilters />
        </div>

        <div>
          <div className="mb-4 lg:hidden">
            <MobileFilterSheet />
          </div>
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm text-navy-700/70">
              <span className="font-semibold text-navy-900">{total.toLocaleString('en-AE')}</span> jobs found
            </p>
            <form>
              <Select name="sort" defaultValue={wantMatch ? 'match' : filter.sort} className="h-9 w-44">
                <option value="newest">Newest first</option>
                <option value="relevance">Most relevant</option>
                <option value="salary">Highest salary</option>
                {seeker && <option value="match">Best matches</option>}
              </Select>
            </form>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <p className="font-display text-lg font-bold text-navy-900">No jobs match your filters</p>
              <p className="mt-1 text-sm text-navy-700/60">Try widening your search or clearing some filters.</p>
              <Link href="/jobs" className="mt-4 inline-block text-sm font-semibold text-teal-600 hover:underline">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
        </div>
      </div>
    </div>
  );
}
