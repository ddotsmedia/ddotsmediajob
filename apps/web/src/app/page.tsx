import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin, Clock, Footprints } from 'lucide-react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@ddots/api';
import { SITE, formatJobDate, isNew, formatSalary, categoryBySlug, emirateBySlug, getJobEmoji } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobSearchBar } from '@/components/job-search-bar';
import { JobCard, formatWalkinDate } from '@/components/job-card';
import { JobTicker } from '@/components/job-ticker';
import { FeatureCards } from '@/components/home/feature-cards';
import { CategoryGrid } from '@/components/home/category-grid';
import { EmployerCTA } from '@/components/home/employer-cta';
import { WhatsAppSection } from '@/components/home/whatsapp-section';
import { EmailAlerts } from '@/components/home/email-alerts';
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
  const [stats, featured, recent, catRows] = await Promise.all([
    api.jobs.stats().catch(() => EMPTY_STATS),
    api.jobs.featured({ limit: 6 }).catch(() => [] as Awaited<ReturnType<typeof api.jobs.featured>>),
    api.jobs.recent({ limit: 10 }).catch(() => [] as Awaited<ReturnType<typeof api.jobs.recent>>),
    api.content.categories().catch(() => [] as Awaited<ReturnType<typeof api.content.categories>>),
  ]);
  const tickerItems = recent.map((j) => ({ slug: j.slug, title: j.title, emirateSlug: j.emirateSlug, publishedAt: j.publishedAt }));

  // Group subcategory names under their parent's slug for the category cards (names only).
  const parentSlugById = new Map(catRows.filter((c) => !c.parentId).map((c) => [c.id, c.slug]));
  const subsByParent: Record<string, string[]> = {};
  for (const r of catRows) {
    if (!r.parentId) continue;
    const pslug = parentSlugById.get(r.parentId);
    if (pslug) (subsByParent[pslug] ??= []).push(r.name);
  }

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
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #F7FAFC 0%, #E8F4F5 100%)' }}>
        <div className="pointer-events-none absolute right-[8%] top-10 z-0 h-[300px] w-[300px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(46,142,151,0.12) 0%, transparent 70%)' }} />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-14 text-center md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E5EEF0] bg-white px-3 py-1 text-xs font-semibold text-[#2E8E97]">
            <span className="h-2 w-2 rounded-full bg-[#8dc63f]" /> UAE&apos;s WhatsApp-Powered Job Portal
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-[#0F172A] sm:text-5xl">
            Find Your Next Job in the <span className="text-[#2E8E97]">UAE</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#64748B] md:text-lg">
            76 groups · 120,000+ members · Free to apply
          </p>
          <div className="mx-auto mt-7 max-w-3xl rounded-2xl border border-[#E5EEF0] bg-white/80 p-2 shadow-lg backdrop-blur">
            <JobSearchBar />
          </div>
          <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide px-1 text-sm text-[#64748B] sm:flex-wrap sm:justify-center sm:gap-x-3">
            <span className="shrink-0">Popular:</span>
            {[
              { l: 'Driver', h: '/jobs?q=Driver' },
              { l: 'Nurse', h: '/jobs?q=Nurse' },
              { l: 'Accountant', h: '/jobs?q=Accountant' },
              { l: 'Walk-in', h: '/jobs/walk-in-interview-dubai' },
              { l: 'Visa Provided', h: '/jobs/visa-provided' },
              { l: 'Urgent Hiring', h: '/jobs/urgent-hiring-uae' },
            ].map((p) => (
              <Link key={p.h} href={p.h} className="shrink-0 rounded-full border border-[#E5EEF0] bg-white px-3 py-1 text-xs text-[#2E8E97] hover:border-[#2E8E97]">
                {p.l}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live jobs ticker ───────────────────────────── */}
      <JobTicker items={tickerItems} />

      <FeatureCards />

      {/* ── Latest Jobs ────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <SectionHead title="Latest Jobs" subtitle={`Showing ${Math.min(8, recent.length)} of ${stats.totalActive.toLocaleString('en-AE')} jobs`} href="/jobs" />
        <div className="mt-5 flex flex-nowrap gap-6 overflow-x-auto scrollbar-hide border-b border-[#E5EEF0]">
          {[
            { l: 'All Jobs', h: '/jobs', active: true },
            { l: 'Walk-in', h: '/jobs/walk-in-interview-dubai', active: false },
            { l: 'Visa Provided', h: '/jobs/visa-provided', active: false },
            { l: 'Urgent', h: '/jobs/urgent-hiring-uae', active: false },
            { l: 'Remote', h: '/jobs/remote', active: false },
            { l: 'Freshers', h: '/jobs/fresher-jobs-uae', active: false },
          ].map((p) => (
            <Link key={p.h} href={p.h} className={`shrink-0 border-b-2 pb-2.5 text-sm transition-colors ${p.active ? 'border-[#2E8E97] font-semibold text-[#2E8E97]' : 'border-transparent font-medium text-[#64748B] hover:text-[#2E8E97]'}`}>
              {p.l}
            </Link>
          ))}
        </div>
        {recent.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed bg-white p-10 text-center">
            <p className="font-display text-lg font-bold text-[#0F172A]">No jobs yet</p>
            <p className="mt-1 text-[#64748B]">Be the first to hire on DdotsMediaJobs.</p>
            <Button asChild variant="accent" className="mt-4"><Link href="/employer/post">Post the first job <ArrowRight /></Link></Button>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {recent.slice(0, 8).map((job) => (
                <LatestJobCard key={job.id} job={job} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild variant="outline" size="lg"><Link href="/jobs">View all jobs <ArrowRight /></Link></Button>
            </div>
          </>
        )}
      </section>

      <CategoryGrid counts={stats.byCategory} subs={subsByParent} />

      {/* ── Featured jobs ──────────────────────────────── */}
      {featured.length > 0 && (
        <section className="bg-[#F7FAFC]">
          <div className="mx-auto max-w-7xl px-4 py-14">
            <SectionHead title="Featured Jobs" subtitle="Hand-picked opportunities from top UAE employers" href="/jobs" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featured.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        </section>
      )}

      <EmployerCTA />
      <WhatsAppSection />
      <EmailAlerts />
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
