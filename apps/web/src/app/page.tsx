import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin, Clock, Footprints } from 'lucide-react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@ddots/api';
import { CATEGORIES, EMIRATES, SITE, formatJobDate, isNew, formatSalary, categoryBySlug, emirateBySlug, getJobEmoji } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobSearchBar } from '@/components/job-search-bar';
import { JobCard, formatWalkinDate } from '@/components/job-card';
import { HomeSidebar } from '@/components/home-sidebar';
import { CategoryIcon } from '@/components/category-icon';
import { NumberTicker } from '@/components/magic/number-ticker';
import { JobTicker } from '@/components/job-ticker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';

export const revalidate = 300; // ISR — refresh stats/featured every 5 min

export const metadata: Metadata = {
  title: { absolute: 'UAE Jobs 2026 — Find Jobs in Dubai, Abu Dhabi & All Emirates | DdotsMediaJobs' },
  description:
    'Browse thousands of verified UAE jobs. Driver jobs Dubai, Nurse jobs UAE, IT jobs, Accountant jobs and more. Free job portal. Apply in one click.',
  keywords: ['UAE Jobs', 'Dubai Jobs', 'Jobs in UAE', 'Gulf Jobs', 'UAE Careers', 'UAE Vacancies'],
};

const EMPTY_STATS = { byCategory: {} as Record<string, number>, byEmirate: {} as Record<string, number>, totalActive: 0, totalSeekers: 0 };

export default async function HomePage() {
  const api = await getApi();
  const [stats, featured, recent] = await Promise.all([
    api.jobs.stats().catch(() => EMPTY_STATS),
    api.jobs.featured({ limit: 6 }).catch(() => [] as Awaited<ReturnType<typeof api.jobs.featured>>),
    api.jobs.recent({ limit: 10 }).catch(() => [] as Awaited<ReturnType<typeof api.jobs.recent>>),
  ]);
  const tickerItems = recent.map((j) => ({ slug: j.slug, title: j.title, emirateSlug: j.emirateSlug, publishedAt: j.publishedAt }));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE.name,
      url: SITE.url,
      logo: `${SITE.url}/logo.png`,
      description: SITE.description,
      sameAs: ['https://www.facebook.com/ddotsmediajobs', 'https://www.linkedin.com/company/ddotsmedia'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE.name,
      url: SITE.url,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/jobs?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#f0fafa]">
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-14 text-center md:py-20">
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-[#0f172a] sm:text-5xl">
            Find Your Next Job in the <span className="text-[#e8623a]">UAE</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500 md:text-lg">
            UAE&apos;s WhatsApp-powered job portal · 76 groups · 80,000+ professionals
          </p>
          <div className="mx-auto mt-7 max-w-3xl">
            <JobSearchBar />
          </div>
          <Link
            href="/whatsapp-groups"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#3a9ea5] hover:underline"
          >
            💬 Join 80,000+ professionals on WhatsApp <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide px-1 text-sm text-slate-500 sm:flex-wrap sm:justify-center sm:gap-x-3">
            <span className="shrink-0">Popular:</span>
            {[
              { l: 'Driver', h: '/jobs?q=Driver' },
              { l: 'Nurse', h: '/jobs?q=Nurse' },
              { l: 'Accountant', h: '/jobs?q=Accountant' },
              { l: 'Walk-in', h: '/jobs/walk-in-interview-dubai' },
              { l: 'Visa Provided', h: '/jobs/visa-provided' },
              { l: 'Urgent Hiring', h: '/jobs/urgent-hiring-uae' },
            ].map((p) => (
              <Link key={p.h} href={p.h} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 hover:border-[#3a9ea5] hover:text-[#3a9ea5]">
                {p.l}
              </Link>
            ))}
          </div>

          {/* inline stats */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 sm:grid-cols-4">
            <HeroStat value={stats.totalActive} suffix="+" label="Active Jobs" />
            <HeroStat value={76} label="WA Groups" />
            <HeroStat value={7} label="Emirates" />
            <HeroStat value={stats.totalSeekers} suffix="+" label="Jobseekers" last />
          </div>
        </div>
      </section>

      {/* ── Live jobs ticker ───────────────────────────── */}
      <JobTicker items={tickerItems} />

      {/* ── Below-hero: sidebar + main content ─────────── */}
      <div className="mx-auto max-w-7xl gap-6 px-4 lg:grid lg:grid-cols-[220px_1fr]">
        <aside className="hidden py-6 lg:block">
          <HomeSidebar />
        </aside>
        <div className="min-w-0">

      {/* Filter tabs (underline style) */}
      <div className="flex flex-nowrap gap-6 overflow-x-auto scrollbar-hide border-b border-slate-200 pt-6">
        {[
          { l: 'All Jobs', h: '/jobs', active: true },
          { l: 'Walk-in', h: '/jobs/walk-in-interview-dubai', active: false },
          { l: 'Urgent', h: '/jobs/urgent-hiring-uae', active: false },
          { l: 'Visa Provided', h: '/jobs/visa-provided', active: false },
          { l: 'Freshers', h: '/jobs/fresher-jobs-uae', active: false },
        ].map((p) => (
          <Link
            key={p.h}
            href={p.h}
            className={`shrink-0 border-b-2 pb-2.5 text-sm transition-colors ${p.active ? 'border-[#3a9ea5] font-semibold text-[#3a9ea5]' : 'border-transparent font-medium text-slate-500 hover:text-[#3a9ea5]'}`}
          >
            {p.l}
          </Link>
        ))}
      </div>

      {/* ── Latest Jobs (primary) ──────────────────────── */}
      <section className="py-8">
        <SectionHead title="Latest Jobs" subtitle={`Showing ${Math.min(6, recent.length)} of ${stats.totalActive.toLocaleString('en-AE')} jobs`} href="/jobs" />
        {recent.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed bg-white p-10 text-center">
            <p className="font-display text-lg font-bold text-navy-900">No jobs yet</p>
            <p className="mt-1 text-navy-700/60">Be the first to hire on DdotsMediaJobs.</p>
            <Button asChild variant="accent" className="mt-4"><Link href="/employer/post">Post the first job <ArrowRight /></Link></Button>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {recent.slice(0, 6).map((job) => (
                <LatestJobCard key={job.id} job={job} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild variant="outline" size="lg"><Link href="/jobs">View all jobs <ArrowRight /></Link></Button>
            </div>
          </>
        )}
      </section>

      {/* ── Category pills (compact, horizontal scroll) ── */}
      <section className="pb-4">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-sm font-semibold text-navy-700">Browse Categories:</span>
          <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide py-1">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-navy-700 transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
              >
                <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
        </div>
      </div>

      {/* ── Featured jobs ──────────────────────────────── */}
      {featured.length > 0 && (
        <section className="bg-navy-50/50">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <SectionHead title="Featured Jobs" subtitle="Hand-picked opportunities from top UAE employers" href="/jobs" />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {featured.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Emirates ───────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionHead title="Jobs by Emirate" subtitle="Explore opportunities in your city" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {EMIRATES.map((e) => (
            <Link
              key={e.slug}
              href={`/jobs-in/${e.slug}`}
              className="rounded-xl border border-l-4 border-slate-100 border-l-[#3a9ea5] bg-white p-5 transition-all hover:border-[#3a9ea5] hover:border-l-[#3a9ea5] hover:shadow-md"
            >
              <span className="block font-display text-lg font-bold text-slate-900">{e.name}</span>
              <span className="text-sm font-semibold text-[#3a9ea5]">
                {(stats.byEmirate[e.slug] ?? 0).toLocaleString('en-AE')} open jobs →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Employer CTA ───────────────────────────────── */}
      <section className="bg-navy-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-14 text-center md:flex-row md:text-left">
          <div>
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">Post a Job in 60 Seconds</h2>
            <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-navy-100/80 md:justify-start">
              <li>✓ Free to post</li>
              <li>✓ AI writes the job description</li>
              <li>✓ Reach thousands of UAE jobseekers</li>
            </ul>
          </div>
          <div className="w-full shrink-0 text-center sm:w-auto">
            <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
              <Link href="/employer/post">
                Post a Job Free <ArrowRight />
              </Link>
            </Button>
            <p className="mt-2 text-xs text-navy-100/60">No account needed to start</p>
          </div>
        </div>
      </section>
    </>
  );
}

type RecentJob = inferRouterOutputs<AppRouter>['jobs']['recent'][number];

function LatestJobCard({ job }: { job: RecentJob }) {
  const fresh = isNew(job.publishedAt);
  const emirate = emirateBySlug(job.emirateSlug)?.name ?? job.emirateSlug;
  const category = categoryBySlug(job.categorySlug)?.name ?? job.categorySlug;
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className={`group flex flex-col gap-3 rounded-xl border border-t-2 border-slate-100 bg-white p-5 transition-all hover:border-[#3a9ea5] hover:shadow-md ${job.walkIn ? 'border-t-[#e8623a]' : job.isUrgent ? 'border-t-[#f5c842]' : job.visaProvided ? 'border-t-[#8dc63f]' : 'border-t-[#3a9ea5]'}`}
    >
      <div className="flex items-start gap-3">
        {job.company?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.company.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-xl">{getJobEmoji(job.title, job.categorySlug)}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-sm font-bold leading-snug text-slate-900 group-hover:text-teal-600 line-clamp-2">{job.title}</h3>
            <span className="flex shrink-0 items-center gap-2">
              {job.walkIn && <Badge className="border-orange-200 bg-orange-50 text-[#e8623a]"><Footprints className="mr-1 h-3 w-3" /> Walk-in</Badge>}
              {fresh && <span className="rounded-full bg-[#f0fafa] px-2 py-0.5 text-[10px] font-semibold text-[#3a9ea5]">New</span>}
              {job.source === 'whapi' && <Badge className="bg-[#25D366]/15 text-[#1a8a4d]">WA</Badge>}
            </span>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">{job.company?.name ?? 'Direct Employer'}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-navy-700/60">
        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {emirate}</span>
        <Badge variant="muted">{category}</Badge>
      </div>
      <div className="mt-auto flex items-center justify-between border-t pt-3 text-sm">
        {job.walkIn && job.walkInDate ? (
          <span className="font-semibold text-teal-700">📅 {formatWalkinDate(job.walkInDate)}{job.walkInTimeStart ? ` · ${job.walkInTimeStart}${job.walkInTimeEnd ? `–${job.walkInTimeEnd}` : ''}` : ''}</span>
        ) : (
          (() => {
            const s = formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden, job.salaryNegotiable);
            return <span className={`font-semibold ${s === 'Salary not disclosed' ? 'text-navy-700/50' : 'text-teal-700'}`}>{s}</span>;
          })()
        )}
        <span className="inline-flex items-center gap-1 text-xs text-navy-700/50"><Clock className="h-3 w-3" /> {formatJobDate(job.publishedAt)}</span>
      </div>
    </Link>
  );
}

function HeroStat({ value, label, suffix, last }: { value: number; label: string; suffix?: string; last?: boolean }) {
  return (
    <div className={`px-2 py-1 text-center ${last ? '' : 'sm:border-r sm:border-slate-200'}`}>
      <div className="font-display text-2xl font-extrabold text-[#3a9ea5]">
        <NumberTicker value={value} suffix={suffix} />
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-400">{label}</div>
    </div>
  );
}

function SectionHead({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy-900 md:text-3xl">{title}</h2>
        <div className="mt-1.5 h-1 w-12 rounded-full bg-teal-500" />
        {subtitle && <p className="mt-2 text-navy-700/60">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-teal-600 hover:underline sm:flex">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
