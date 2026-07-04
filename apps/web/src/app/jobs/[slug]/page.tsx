import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import { MapPin, Briefcase, Banknote, Clock, GraduationCap, BadgeCheck, CheckCircle2 } from 'lucide-react';
import { TRPCError } from '@trpc/server';
import {
  formatSalary,
  formatDateTime,
  formatRelative,
  isExpired,
  emirateBySlug,
  categoryBySlug,
  expLabel,
  expiryDaysLeft,
  responseBadge,
  formatJobDate,
  UAE_TZ,
  SITE,
  getJobEmoji,
} from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobActions } from '@/components/job-actions';
import { JobViewTracker } from '@/components/job-view-tracker';
import { QuickApplyButton } from '@/components/quick-apply-button';
import { JobAiTools } from '@/components/job-ai-tools';
import { MatchScoreCard } from '@/components/ai/match-score';
import { SkillGap } from '@/components/ai/skill-gap';
import { ShareRow } from '@/components/share-row';
import { ReferJobButton } from '@/components/refer-job-button';
import { SimilarJobs } from '@/components/similar-jobs';
import { MobileApplyBar } from '@/components/mobile-apply-bar';
import { SocialShareBar } from '@/components/jobs/SocialShareBar';
import { formatWalkinDate } from '@/components/job-card';
import { Badge, Card, CardContent } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { parseRoleEmirate, roleEmirateMetadata, roleEmirateStaticParams, RoleEmirateView } from './role-emirate';
import { parseRolePage, rolePageMetadata, rolePageStaticParams, RolePageView } from './role-jobs';

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

/** Pre-render the 84 role+emirate SEO pages; job slugs still render on-demand. */
export function generateStaticParams() {
  return [...roleEmirateStaticParams(), ...rolePageStaticParams()];
}

async function loadJob(slug: string) {
  try {
    const api = await getApi();
    const job = await api.jobs.bySlug({ slug });
    console.log('[loadJob] found job:', job?.id, job?.status);
    return job;
  } catch (err) {
    console.error('[loadJob] slug:', slug, 'error:', err);
    if (err instanceof TRPCError && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const re = parseRoleEmirate(slug);
  if (re) return roleEmirateMetadata(re.category, re.emirate);
  const rp = parseRolePage(slug);
  if (rp) return rolePageMetadata(rp);
  const job = await loadJob(slug);
  if (!job) return { title: 'Job not found' };
  const emirate = emirateBySlug(job.emirateSlug)?.name ?? 'UAE';
  const company = job.company?.name ?? 'Direct Employer';
  // Don't produce "UAE, UAE" when the emirate is already UAE / ends with UAE.
  const locationStr = /uae$/i.test(emirate.trim()) ? emirate : `${emirate}, UAE`;
  const title = `${job.title} at ${company} in ${locationStr} | DdotsMediaJobs`;
  const pay = formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden, job.salaryNegotiable);
  const posted = formatJobDate(job.publishedAt ?? job.createdAt);
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/[#*]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Drop the job title if the description repeats it at the start, then cap length.
  const stripTitle = (s: string) => { const t = job.title.trim(); return s.toLowerCase().startsWith(t.toLowerCase()) ? s.slice(t.length).replace(/^[\s:–-]+/, '') : s; };
  const cleanDescription = stripTitle(stripHtml(job.description)).slice(0, 100);
  const description = `Apply for ${job.title} at ${company} in ${locationStr}. ${pay}. ${cleanDescription}. Posted ${posted}. Apply on WhatsApp.`.slice(0, 200);
  const ogImage = `/jobs/${job.slug}/opengraph-image`;
  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${SITE.url}/jobs/${job.slug}`,
      images: [ogImage],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: `${SITE.url}/jobs/${job.slug}` },
  };
}

const GTAG_EMPLOYMENT: Record<string, string> = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
  contract: 'CONTRACTOR',
  temporary: 'TEMPORARY',
  internship: 'INTERN',
  freelance: 'CONTRACTOR',
};

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const re = parseRoleEmirate(slug);
  if (re) return <RoleEmirateView category={re.category} emirate={re.emirate} />;
  const rp = parseRolePage(slug);
  if (rp) return <RolePageView page={rp} />;
  const job = await loadJob(slug);
  if (!job) notFound();

  const emirate = emirateBySlug(job.emirateSlug);
  const category = categoryBySlug(job.categorySlug);

  // Google for Jobs structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: (job.publishedAt ?? job.createdAt).toISOString(),
    validThrough: job.expiresAt?.toISOString(),
    employmentType: GTAG_EMPLOYMENT[job.jobType] ?? 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company?.name ?? 'Direct Employer',
      logo: job.company?.logoUrl ?? undefined,
      ...(job.company?.website ? { sameAs: job.company.website } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: emirate?.name,
        addressRegion: emirate?.name,
        addressCountry: 'AE',
      },
    },
    directApply: true,
    ...((job.applyWhatsapp || job.contactWhatsapp || job.applyEmail || job.applyUrl)
      ? {
          potentialAction: {
            '@type': 'ApplyAction',
            target: job.applyUrl
              ? job.applyUrl
              : (job.applyWhatsapp || job.contactWhatsapp)
                ? `https://wa.me/${(job.applyWhatsapp || job.contactWhatsapp || '').replace(/\D/g, '')}`
                : `mailto:${job.applyEmail}`,
          },
        }
      : {}),
    ...(job.salaryMin && !job.salaryHidden
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'AED',
            value: {
              '@type': 'QuantitativeValue',
              minValue: job.salaryMin,
              maxValue: job.salaryMax ?? job.salaryMin,
              unitText: 'MONTH',
            },
          },
        }
      : {}),
    ...(job.isRemote ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: 'United Arab Emirates' } } : {}),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${SITE.url}/jobs` },
      ...(category ? [{ '@type': 'ListItem', position: 3, name: category.name, item: `${SITE.url}/category/${category.slug}` }] : []),
      ...(emirate ? [{ '@type': 'ListItem', position: category ? 4 : 3, name: emirate.name, item: `${SITE.url}/jobs-in/${emirate.slug}` }] : []),
      { '@type': 'ListItem', position: (category ? 4 : 3) + (emirate ? 1 : 0), name: job.title, item: `${SITE.url}/jobs/${job.slug}` },
    ],
  };

  return (
    <div className="bg-navy-50/30">
      <JobViewTracker slug={job.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="mx-auto max-w-7xl px-4 py-8 pb-32 lg:pb-8">
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-navy-700/60">
          <Link href="/" className="hover:text-teal-600">Home</Link>
          <span>/</span>
          <Link href="/jobs" className="hover:text-teal-600">Jobs</Link>
          {category && (
            <>
              <span>/</span>
              <Link href={`/category/${category.slug}`} className="hover:text-teal-600">{category.name}</Link>
            </>
          )}
          {emirate && (
            <>
              <span>/</span>
              <Link href={`/jobs-in/${emirate.slug}`} className="hover:text-teal-600">{emirate.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="truncate text-navy-900">{job.title}</span>
        </nav>

        {(() => {
          const days = expiryDaysLeft(job.expiresAt);
          if (days == null || days < 0 || days >= 7) return null;
          return (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
              ⏳ Closing soon — {days === 0 ? 'applications close today' : `only ${days} day${days === 1 ? '' : 's'} left to apply`}.
            </div>
          );
        })()}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {job.company?.logoUrl && !job.isAnonymous ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={job.company.logoUrl} alt="" className="h-[52px] w-[52px] shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-2xl">
                      {getJobEmoji(job.title, job.categorySlug)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="max-w-full break-words font-display text-xl font-bold text-navy-900 sm:text-2xl">{getJobEmoji(job.title, job.categorySlug)} {job.title}</h1>
                      {job.isUrgent && <Badge variant="urgent">Urgent</Badge>}
                      {job.isFeatured && <Badge>Featured</Badge>}
                      {job.viewCount > 50 && <Badge variant="urgent">🔥 Popular</Badge>}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-navy-700">
                      {job.isAnonymous ? `Confidential Company · ${categoryBySlug(job.categorySlug)?.name ?? ''}` : (job.company?.name ?? 'Direct Employer')}
                      {!job.isAnonymous && job.company?.isVerified && <BadgeCheck className="h-4 w-4 text-teal-500" />}
                      {(() => {
                        const b = responseBadge(job.employerResponseHours);
                        return b ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${b.cls}`}>{b.label}</span> : null;
                      })()}
                    </p>
                    <div className="mt-1.5 space-y-1 text-xs text-navy-700/60">
                      <p className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Posted: {formatDateTime(job.publishedAt ?? job.createdAt)}</p>
                      {job.updatedAt && job.publishedAt && new Date(job.updatedAt).getTime() - new Date(job.publishedAt).getTime() > 60_000 && (
                        <p>Last updated {formatRelative(job.updatedAt)}</p>
                      )}
                      {['whapi', 'whatsapp', 'whatsapp_bot'].includes(job.source) && <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2 py-0.5 font-medium text-[#1a8a4f]">📲 Via WhatsApp</span>}
                      {job.source === 'telegram' && <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">✈ Via Telegram</span>}
                      {job.expiresAt && (isExpired(job.expiresAt)
                        ? <p className="font-medium text-amber-600">⚠ Applications closed</p>
                        : <p>Applications close: {new Intl.DateTimeFormat('en-GB', { timeZone: UAE_TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(job.expiresAt))}</p>)}
                    </div>

                    {/* Quick facts — 2x2 grid on mobile, inline row on larger screens */}
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-medium text-navy-700/80 sm:flex sm:flex-wrap sm:items-center">
                      <span className="min-w-0 truncate">📍 {emirate?.name ?? 'UAE'}</span>
                      <span className="min-w-0 truncate capitalize">💼 {job.jobType.replace('-', ' ')}</span>
                      <span className="min-w-0 truncate">💰 {formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden, job.salaryNegotiable)}</span>
                      <span className="min-w-0 truncate">⏰ {formatJobDate(job.publishedAt ?? job.createdAt)}</span>
                      <span className="min-w-0 truncate">👁 {job.viewCount.toLocaleString('en-AE')} views</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 sm:grid-cols-4">
                  <Fact icon={MapPin} label="Location" value={job.location ?? emirate?.name ?? 'UAE'} />
                  <Fact icon={Clock} label="Job Type" value={job.jobType.replace('-', ' ')} />
                  <Fact icon={GraduationCap} label="Experience" value={expLabel(job.experienceLevel)} />
                  <Fact icon={Banknote} label="Salary" value={formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden, job.salaryNegotiable)} valueClassName={formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden, job.salaryNegotiable) === 'Salary not disclosed' ? 'text-navy-700/50' : 'text-teal-700'} />
                </div>

                {/* Benefits tags (from flags + description) */}
                {(() => {
                  const desc = job.description.toLowerCase();
                  const tags: string[] = ['🇦🇪 UAE based'];
                  if (job.visaProvided || /visa/.test(desc)) tags.push('Visa provided');
                  if (job.accommodationProvided || /accommodation|housing/.test(desc)) tags.push('Accommodation');
                  if (/transport|pick.?up|bus/.test(desc)) tags.push('Transport');
                  if (/insurance|medical/.test(desc)) tags.push('Medical insurance');
                  if (job.isRemote) tags.push('Remote');
                  if (job.freeZone) tags.push('Free zone');
                  if (job.isFresher) tags.push('Freshers welcome');
                  return (
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                      {tags.map((t) => (
                        <span key={t} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">{t}</span>
                      ))}
                    </div>
                  );
                })()}
                {(() => {
                  const days = expiryDaysLeft(job.expiresAt);
                  if (days == null || days < 0) return null;
                  const urgent = days < 3;
                  return (
                    <p className={`mt-4 border-t pt-4 text-sm font-medium ${urgent ? 'text-red-600' : 'text-navy-700/70'}`}>
                      {urgent ? '⚡ ' : '🗓 '}Applications close: {formatDateTime(job.expiresAt)}{urgent ? ` — only ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} left`}!` : ''}
                    </p>
                  );
                })()}
              </CardContent>
            </Card>

            <SocialShareBar
              title={job.title}
              url={`${SITE.url}/jobs/${job.slug}`}
              company={job.isAnonymous ? 'Confidential Company' : (job.company?.name ?? 'Direct Employer')}
              walkIn={job.walkIn}
              walkInDate={job.walkInDate}
              walkInTimeStart={job.walkInTimeStart}
              walkInTimeEnd={job.walkInTimeEnd}
              walkInVenue={job.walkInVenue}
            />

            <Card>
              <CardContent className="prose prose-slate max-w-none p-6 prose-headings:font-display">
                <h2 className="text-lg font-bold text-navy-900">Job Description</h2>
                {/^\s*</.test(job.description) ? (
                  <div className="text-navy-700" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.description) }} />
                ) : (
                  <div className="whitespace-pre-wrap text-navy-700">{job.description}</div>
                )}

                {job.skills.length > 0 && (
                  <>
                    <h3 className="mt-6 text-base font-bold text-navy-900">Key Skills</h3>
                    <div className="not-prose grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {job.skills.slice(0, 6).map((s) => (
                        <span key={s} className="inline-flex items-center gap-2 rounded-lg border bg-navy-50/50 px-3 py-2 text-sm text-navy-800">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-500" /> {s}
                        </span>
                      ))}
                    </div>
                    {job.skills.length > 6 && <p className="not-prose mt-2 text-xs text-navy-700/50">+{job.skills.length - 6} more skills listed in the description</p>}
                  </>
                )}

                {job.benefits.length > 0 && (
                  <>
                    <h3 className="mt-6 text-base font-bold text-navy-900">Benefits</h3>
                    <ul className="not-prose space-y-1">
                      {job.benefits.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-sm text-navy-700">
                          <CheckCircle2 className="h-4 w-4 text-teal-500" /> {b}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>

            {/* How to apply — direct contact methods */}
            {(() => {
              const wa = (job.applyWhatsapp || job.contactWhatsapp || '').replace(/\D/g, '');
              const email = job.applyEmail;
              if (!wa && !email && !job.applyUrl) return null;
              const fmtWa = wa.startsWith('971') && wa.length === 12 ? `+971 ${wa.slice(3, 5)} ${wa.slice(5, 8)} ${wa.slice(8)}` : `+${wa}`;
              return (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="font-display text-lg font-bold text-navy-900">How to apply</h2>
                    <div className="mt-3 space-y-2">
                      {wa && (
                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-[#25D366]/30 bg-[#25D366]/5 px-4 py-3 text-sm font-semibold text-[#1a8a4d] hover:bg-[#25D366]/10">
                          📲 Apply on WhatsApp: <span className="font-bold">{fmtWa}</span>
                        </a>
                      )}
                      {email && (
                        <a href={`mailto:${email}?subject=${encodeURIComponent(`Application for ${job.title}`)}`} className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold text-navy-800 hover:bg-navy-50">
                          📧 Email CV: <span className="font-bold text-teal-700">{email}</span>
                        </a>
                      )}
                      {wa && (
                        <a href={`tel:+${wa}`} className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold text-navy-800 hover:bg-navy-50">
                          📞 Call: <span className="font-bold">{fmtWa}</span>
                        </a>
                      )}
                      {job.applyUrl && (
                        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-navy-50">
                          🔗 Apply online
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-base font-bold text-navy-900">Explore more</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/jobs/${job.categorySlug}-jobs-in-${job.emirateSlug}`} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-700 hover:bg-teal-100">More {category?.name} jobs in {emirate?.name}</Link>
                  <Link href={`/salary/${job.categorySlug}-salary-in-${job.emirateSlug}`} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-700 hover:bg-teal-100">{category?.name} salary in {emirate?.name}</Link>
                  <Link href={`/interview-questions/${job.categorySlug}-in-uae`} className="rounded-full border border-navy-200 bg-white px-3 py-1 text-sm text-navy-700 hover:bg-navy-50">{category?.name} interview questions</Link>
                </div>
              </CardContent>
            </Card>

            {job.showEmployer && !job.isAnonymous && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-display text-base font-bold text-navy-900">About the employer</h2>
                  <div className="mt-3 flex items-start gap-3">
                    {job.company?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={job.company.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">{(job.company?.name ?? 'DE').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'DE'}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-semibold text-navy-900">
                        {job.company?.name ?? 'Direct Employer'}
                        {job.company?.isVerified && <BadgeCheck className="h-4 w-4 text-teal-500" />}
                      </p>
                      <p className="text-sm text-navy-700/60">📍 {emirate?.name ?? 'UAE'} · {job.employerActiveJobs} active job{job.employerActiveJobs === 1 ? '' : 's'}</p>
                      {(() => { const b = responseBadge(job.employerResponseHours); return b ? <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>{b.label}</span> : null; })()}
                      {job.company?.about && <p className="mt-2 line-clamp-3 text-sm text-navy-700/80">{job.company.about}</p>}
                      {job.company?.slug && (
                        <Link href={`/companies/${job.company.slug}`} className="mt-2 inline-block text-sm font-semibold text-teal-600 hover:underline">View company profile →</Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <SimilarJobs jobId={job.id} />
          </div>

          <div id="apply" className="scroll-mt-24 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="p-5">
                {job.walkIn ? (
                  /* Walk-in interview — replaces the apply buttons */
                  (() => {
                    const wa = (job.walkInContactPhone || job.applyWhatsapp || job.contactWhatsapp || '').replace(/\D/g, '');
                    const dir = job.walkInMapsUrl || (job.walkInVenue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.walkInVenue)}` : null);
                    const docs = (job.walkInRequiredDocs ?? '').split(/[,\n]/).map((d) => d.trim()).filter(Boolean);
                    return (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4">
                          <p className="flex items-center gap-1.5 font-display text-sm font-bold text-teal-800">🚶 Walk-in Interview</p>
                          <dl className="mt-2 space-y-1.5 text-sm text-navy-800">
                            {job.walkInDate && <div className="flex gap-2"><span className="text-navy-700/60">📅 {job.walkInLastDate ? 'Open:' : 'Date:'}</span> <span className="font-semibold">{formatWalkinDate(job.walkInDate)}{job.walkInLastDate ? ` – ${formatWalkinDate(job.walkInLastDate)}` : ''}</span></div>}
                            {(job.walkInTimeStart || job.walkInTime) && <div className="flex gap-2"><span className="text-navy-700/60">⏰ Time:</span> <span className="font-semibold">{job.walkInTimeStart ? `${job.walkInTimeStart}${job.walkInTimeEnd ? ` – ${job.walkInTimeEnd}` : ''}` : job.walkInTime}</span></div>}
                            {job.walkInVenue && <div className="flex gap-2"><span className="shrink-0 text-navy-700/60">📍 Venue:</span> <span className="font-semibold">{job.walkInVenue}</span></div>}
                          </dl>
                        </div>
                        {docs.length > 0 && (
                          <div className="rounded-lg border bg-white p-4">
                            <p className="text-sm font-bold text-navy-900">📋 Bring with you</p>
                            <ul className="mt-2 space-y-1 text-sm text-navy-700">
                              {docs.map((d) => <li key={d} className="flex items-center gap-2"><span className="text-teal-600">✓</span> {d}</li>)}
                            </ul>
                          </div>
                        )}
                        {dir && (
                          <a href={dir} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E8622A] py-3 text-sm font-semibold text-white active:scale-95">
                            📍 Get Directions
                          </a>
                        )}
                        {wa && (
                          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I'm interested in the ${job.title} walk-in interview`)}`} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3 text-sm font-semibold text-white active:scale-95">
                            💬 Contact on WhatsApp
                          </a>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <>
                    {/* Apply buttons — desktop only; mobile uses the sticky bottom bar */}
                    <div className="hidden lg:block">
                      <JobActions
                        jobId={job.id}
                        title={job.title}
                        slug={job.slug}
                        company={job.isAnonymous ? null : job.company?.name}
                        applyEmail={job.applyEmail}
                        applyWhatsapp={job.applyWhatsapp}
                        contactWhatsapp={job.contactWhatsapp}
                      />
                      <div className="mt-3">
                        <QuickApplyButton jobId={job.id} className="w-full" preferWhatsapp={job.applyWhatsapp || job.contactWhatsapp} preferEmail={job.applyEmail} />
                      </div>
                    </div>
                  </>
                )}

                {/* Stats row */}
                <p className="mt-3 border-t pt-3 text-center text-xs text-navy-700/60">
                  {job.viewCount.toLocaleString('en-AE')} views · {job.applicationCount} applied
                  {(() => { const d = expiryDaysLeft(job.expiresAt); return d != null && d >= 0 ? ` · ${d === 0 ? 'closes today' : `${d} day${d === 1 ? '' : 's'} left`}` : ''; })()}
                </p>

                {/* Share row */}
                <div className="mt-3">
                  <ShareRow url={`${SITE.url}/jobs/${job.slug}`} title={job.title} />
                </div>
              </CardContent>
            </Card>

            {/* AI tools grouped */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-display font-bold text-navy-900">AI tools for this job</h3>
                <div className="mt-3 space-y-3">
                  <JobAiTools jobId={job.id} />
                  <MatchScoreCard jobId={job.id} />
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/tools/salary-comparison?title=${encodeURIComponent(job.title)}&emirate=${job.emirateSlug}`}>Compare salary</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/cv-builder">Prepare your CV</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <SkillGap jobId={job.id} />

            {/* Similar job alerts */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-display font-bold text-navy-900">Get similar job alerts</h3>
                <p className="mt-1 text-sm text-navy-700/60">{category?.name} jobs in {emirate?.name ?? 'the UAE'}, straight to you.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button asChild variant="accent" size="sm"><Link href={`/dashboard/alerts?category=${job.categorySlug}&emirate=${job.emirateSlug}&channel=whatsapp`}>WhatsApp</Link></Button>
                  <Button asChild variant="outline" size="sm"><Link href={`/dashboard/alerts?category=${job.categorySlug}&emirate=${job.emirateSlug}`}>Email</Link></Button>
                </div>
              </CardContent>
            </Card>

            {/* Refer & earn */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-display font-bold text-navy-900">Know someone perfect?</h3>
                <div className="mt-3">
                  <ReferJobButton title={job.title} slug={job.slug} salary={formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden, job.salaryNegotiable)} emirate={emirate?.name ?? 'UAE'} company={job.isAnonymous ? null : job.company?.name} />
                </div>
                <p className="mt-2 text-xs text-navy-700/50">Earn rewards when they get hired.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <MobileApplyBar
        title={job.title}
        url={`${SITE.url}/jobs/${job.slug}`}
        waHref={(() => { const wa = ((job.walkIn && job.walkInContactPhone) || job.applyWhatsapp || job.contactWhatsapp || '').replace(/\D/g, ''); return wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I'm interested in the ${job.title}${job.walkIn ? ' walk-in interview' : ' position'}`)}` : null; })()}
        applyHref={job.walkIn
          ? (job.walkInMapsUrl || (job.walkInVenue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.walkInVenue)}` : '#apply'))
          : (job.applyUrl || (job.applyEmail ? `mailto:${job.applyEmail}?subject=${encodeURIComponent(`Application for ${job.title}`)}` : '#apply'))}
        applyLabel={job.walkIn ? '📍 Directions' : 'Apply Now'}
        expired={!!(job.expiresAt && isExpired(job.expiresAt)) || job.status !== 'active'}
      />
    </div>
  );
}

function Fact({ icon: Icon, label, value, valueClassName }: { icon: any; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
      <div>
        <div className="text-xs text-navy-700/50">{label}</div>
        <div className={`text-sm font-semibold capitalize ${valueClassName ?? 'text-navy-900'}`}>{value}</div>
      </div>
    </div>
  );
}
