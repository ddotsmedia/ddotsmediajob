import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import { MapPin, Briefcase, Banknote, Clock, GraduationCap, BadgeCheck, CheckCircle2 } from 'lucide-react';
import { TRPCError } from '@trpc/server';
import {
  formatSalary,
  timeAgo,
  emirateBySlug,
  categoryBySlug,
  expLabel,
  SITE,
} from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobActions } from '@/components/job-actions';
import { MatchScoreCard } from '@/components/ai/match-score';
import { SkillGap } from '@/components/ai/skill-gap';
import { ShareMenu } from '@/components/share-menu';
import { ReferJobButton } from '@/components/refer-job-button';
import { MobileApplyBar } from '@/components/mobile-apply-bar';
import { Badge, Card, CardContent } from '@/components/ui/primitives';
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
    return await api.jobs.bySlug({ slug });
  } catch (err) {
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
  const title = `${job.title} — ${job.company?.name ?? 'Confidential'} in ${emirate}`;
  const description = job.description.replace(/[#*]/g, '').slice(0, 155);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE.url}/jobs/${job.slug}`,
      images: [`/jobs/${job.slug}/opengraph-image`],
    },
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
      name: job.company?.name ?? 'Confidential',
      logo: job.company?.logoUrl ?? undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: emirate?.name,
        addressCountry: 'AE',
      },
    },
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

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-7xl px-4 py-8 pb-32 lg:pb-8">
        <nav className="mb-4 text-sm text-navy-700/60">
          <Link href="/jobs" className="hover:text-teal-600">Jobs</Link>
          {category && (
            <>
              {' / '}
              <Link href={`/category/${category.slug}`} className="hover:text-teal-600">{category.name}</Link>
            </>
          )}
          {' / '}
          <span className="text-navy-900">{job.title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-50 sm:h-16 sm:w-16">
                    {job.company?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={job.company.logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <Briefcase className="h-7 w-7 text-teal-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-xl font-bold text-navy-900 sm:text-2xl">{job.title}</h1>
                      {job.isUrgent && <Badge variant="urgent">Urgent</Badge>}
                      {job.isFeatured && <Badge>Featured</Badge>}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-navy-700">
                      {job.isAnonymous ? `Confidential Company · ${categoryBySlug(job.categorySlug)?.name ?? ''}` : (job.company?.name ?? 'Confidential')}
                      {!job.isAnonymous && job.company?.isVerified && <BadgeCheck className="h-4 w-4 text-teal-500" />}
                    </p>
                    <p className="mt-1 text-xs text-navy-700/50">Posted {timeAgo(job.publishedAt ?? job.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 sm:grid-cols-4">
                  <Fact icon={MapPin} label="Location" value={job.location ?? emirate?.name ?? 'UAE'} />
                  <Fact icon={Clock} label="Job Type" value={job.jobType.replace('-', ' ')} />
                  <Fact icon={GraduationCap} label="Experience" value={expLabel(job.experienceLevel)} />
                  <Fact icon={Banknote} label="Salary" value={formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden)} />
                </div>
              </CardContent>
            </Card>

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
                    <h3 className="mt-6 text-base font-bold text-navy-900">Required Skills</h3>
                    <div className="not-prose flex flex-wrap gap-2">
                      {job.skills.map((s) => (
                        <Badge key={s} variant="muted">{s}</Badge>
                      ))}
                    </div>
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
          </div>

          <div id="apply" className="scroll-mt-24 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="p-5">
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
                  <ShareMenu jobId={job.id} title={job.title} url={`${SITE.url}/jobs/${job.slug}`} variant="button" />
                </div>
                <div className="mt-3">
                  <ReferJobButton title={job.title} slug={job.slug} salary={formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden)} emirate={emirate?.name ?? 'UAE'} company={job.isAnonymous ? null : job.company?.name} />
                </div>
                <p className="mt-3 text-center text-xs text-navy-700/50">{job.applicationCount} applicants · {job.viewCount} views</p>
              </CardContent>
            </Card>

            <MatchScoreCard jobId={job.id} />

            <SkillGap jobId={job.id} />

            {job.company && !job.isAnonymous && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-display font-bold text-navy-900">About {job.company.name}</h3>
                  {job.company.about && <p className="mt-2 text-sm text-navy-700/80">{job.company.about}</p>}
                  <Link href={`/companies/${job.company.slug}`} className="mt-3 inline-block text-sm font-semibold text-teal-600 hover:underline">
                    View company profile →
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <MobileApplyBar salary={formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod, job.salaryHidden)} />
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
      <div>
        <div className="text-xs text-navy-700/50">{label}</div>
        <div className="text-sm font-semibold capitalize text-navy-900">{value}</div>
      </div>
    </div>
  );
}
