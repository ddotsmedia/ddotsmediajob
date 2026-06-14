import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, Users, BriefcaseBusiness, CheckCircle2 } from 'lucide-react';
import { CATEGORIES, EMIRATES, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobSearchBar } from '@/components/job-search-bar';
import { JobCard } from '@/components/job-card';
import { CategoryIcon } from '@/components/category-icon';
import { NumberTicker } from '@/components/magic/number-ticker';
import { GridPattern } from '@/components/magic/grid-pattern';
import { Button } from '@/components/ui/button';

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
  const [stats, featured] = await Promise.all([
    api.jobs.stats().catch(() => EMPTY_STATS),
    api.jobs.featured({ limit: 6 }).catch(() => [] as Awaited<ReturnType<typeof api.jobs.featured>>),
  ]);

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
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <GridPattern />
        <div className="pointer-events-none absolute -right-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 text-center md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-sm font-medium text-teal-300">
            <CheckCircle2 className="h-4 w-4" /> {stats.totalActive.toLocaleString('en-AE')}+ live jobs across the UAE
          </span>
          <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight sm:text-4xl md:text-6xl">
            Find Your Next Job
            <br />
            in the <span className="text-teal-400">UAE</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-navy-100/80">
            Thousands of verified vacancies in Dubai, Abu Dhabi, Sharjah and beyond. Apply in one click.
          </p>
          <div className="mx-auto mt-8 max-w-3xl">
            <JobSearchBar />
          </div>
          <div className="mt-6 flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide px-1 text-sm text-navy-100/70 sm:flex-wrap sm:justify-center sm:gap-x-3">
            <span className="shrink-0">Popular:</span>
            {['Driver', 'Accountant', 'Nurse', 'Sales', 'Receptionist'].map((t) => (
              <Link key={t} href={`/jobs?q=${t}`} className="shrink-0 rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">
                {t}
              </Link>
            ))}
            {[
              { l: 'Walk-in', h: '/jobs/walk-in-interview-dubai' },
              { l: 'Urgent Hiring', h: '/jobs/urgent-hiring-uae' },
              { l: 'Visa Provided', h: '/jobs/visa-provided' },
              { l: 'Work from Home', h: '/jobs/remote' },
            ].map((p) => (
              <Link key={p.h} href={p.h} className="shrink-0 rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">
                {p.l}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────── */}
      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-12 md:grid-cols-4">
          <Stat icon={BriefcaseBusiness} value={stats.totalActive} suffix="+" label="Active Jobs" />
          <Stat icon={Building2} value={stats.byCategory ? Object.keys(stats.byCategory).length : 12} label="Industries" />
          <Stat icon={MapPinCount} value={7} label="Emirates Covered" />
          <Stat icon={Users} value={stats.totalSeekers} suffix="+" label="Jobseekers" />
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionHead title="Browse by Category" subtitle="Find roles in your field across every emirate" href="/jobs" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="group flex items-center gap-3 rounded-xl border bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md sm:p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-500 group-hover:text-white sm:h-11 sm:w-11">
                <CategoryIcon name={c.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold text-navy-900">{c.name}</span>
                <span className="block text-xs text-navy-700/60">
                  {(stats.byCategory[c.slug] ?? 0).toLocaleString('en-AE')} jobs
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

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
              className="rounded-xl border bg-white p-5 transition-all hover:border-teal-300 hover:shadow-md"
            >
              <span className="block font-display font-bold text-navy-900">{e.name}</span>
              <span className="text-sm text-teal-600">
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

function Stat({ icon: Icon, value, label, suffix }: { icon: any; value: number; label: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <div className="font-display text-2xl font-extrabold text-navy-900">
          <NumberTicker value={value} suffix={suffix} />
        </div>
        <div className="text-sm text-navy-700/60">{label}</div>
      </div>
    </div>
  );
}

function MapPinCount(props: { className?: string }) {
  return <Building2 {...props} />;
}

function SectionHead({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy-900 md:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-navy-700/60">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-teal-600 hover:underline sm:flex">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
