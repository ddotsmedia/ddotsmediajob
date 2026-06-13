import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Building2, BadgeCheck, Globe, Linkedin, Instagram, Star, Clock, Calendar, Users, Quote, Check } from 'lucide-react';
import { TRPCError } from '@trpc/server';
import { emirateBySlug, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';
import { CompanyReviews } from '@/components/company-reviews';
import { FollowCompanyButton } from '@/components/follow-company-button';
import { Badge } from '@/components/ui/primitives';

export const revalidate = 600;

async function load(slug: string) {
  try {
    const api = await getApi();
    return await api.content.companyBySlug({ slug });
  } catch (err) {
    if (err instanceof TRPCError && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: 'Company not found' };
  return {
    title: `${data.company.name} — Jobs & Company Profile`,
    description: data.company.about ?? `Open jobs at ${data.company.name} in the UAE.`,
    alternates: { canonical: `${SITE.url}/companies/${slug}` },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { company, openJobs, extras, followerCount, isFollowing, similar } = data;
  const meta = [
    extras?.founded && { icon: Calendar, label: `Founded ${extras.founded}` },
    extras?.companyType && { icon: Building2, label: extras.companyType },
    (extras?.teamSize || company.size) && { icon: Users, label: `${extras?.teamSize ?? company.size} employees` },
    extras?.workingHours && { icon: Clock, label: extras.workingHours },
  ].filter(Boolean) as { icon: typeof Calendar; label: string }[];

  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <Building2 className="h-9 w-9 text-teal-400" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-white">
              {company.name}
              {company.isVerified && <BadgeCheck className="h-6 w-6 text-teal-400" />}
            </h1>
            <p className="mt-1 text-navy-100/70">
              {company.industry} {company.emirateSlug && `· ${emirateBySlug(company.emirateSlug)?.name}`}
            </p>
            <p className="mt-1 text-sm font-medium text-teal-300">Now hiring {openJobs.length} role{openJobs.length === 1 ? '' : 's'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-teal-300 hover:underline"><Globe className="h-4 w-4" /> Website</a>
              )}
              {extras?.linkedin && <a href={extras.linkedin} target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:text-white"><Linkedin className="h-4 w-4" /></a>}
              {extras?.instagram && <a href={extras.instagram} target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:text-white"><Instagram className="h-4 w-4" /></a>}
              {extras?.glassdoorUrl && <a href={extras.glassdoorUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-teal-300 hover:underline"><Star className="h-4 w-4" /> Glassdoor</a>}
              {extras?.tourImageUrl && <Link href={`/companies/${slug}/tour`} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-teal-200 hover:bg-white/20">🏢 Virtual office tour</Link>}
            </div>
          </div>
          <FollowCompanyButton companyId={company.id} initialFollowing={isFollowing} followerCount={followerCount} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {(company.about || meta.length > 0) && (
          <div className="mb-8 rounded-xl border bg-white p-6">
            <h2 className="font-display text-lg font-bold text-navy-900">About</h2>
            {company.about && <p className="mt-2 text-navy-700/80">{company.about}</p>}
            {meta.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-navy-700/70">
                {meta.map((m) => (
                  <span key={m.label} className="inline-flex items-center gap-1.5"><m.icon className="h-4 w-4 text-teal-600" /> {m.label}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {(extras?.cultureDescription || (extras?.benefits?.length ?? 0) > 0) && (
          <div className="mb-8 rounded-xl border bg-white p-6">
            <h2 className="font-display text-lg font-bold text-navy-900">Why work here</h2>
            {extras?.cultureDescription && <p className="mt-2 text-navy-700/80">{extras.cultureDescription}</p>}
            {(extras?.benefits?.length ?? 0) > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {extras!.benefits.map((b) => (
                  <span key={b} className="inline-flex items-center gap-2 text-sm text-navy-700/80"><Check className="h-4 w-4 text-green-600" /> {b}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {extras?.cultureVideo && (
          <div className="mb-8 rounded-xl border bg-white p-6">
            <h2 className="font-display text-lg font-bold text-navy-900">A day at {company.name}</h2>
            <div className="mt-3 aspect-video overflow-hidden rounded-lg">
              {/youtube\.com|youtu\.be/.test(extras.cultureVideo) ? (
                <iframe className="h-full w-full" src={extras.cultureVideo.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} title="Culture video" allowFullScreen />
              ) : (
                <video className="h-full w-full" src={extras.cultureVideo} controls />
              )}
            </div>
          </div>
        )}

        {(extras?.officePhotos?.length ?? 0) > 0 && (
          <div className="mb-8 rounded-xl border bg-white p-6">
            <h2 className="font-display text-lg font-bold text-navy-900">Office photos</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {extras!.officePhotos.slice(0, 6).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`${company.name} office ${i + 1}`} className="aspect-video w-full rounded-lg object-cover" />
              ))}
            </div>
          </div>
        )}

        {extras?.ceoMessage && (
          <div className="mb-8 rounded-xl border bg-white p-6">
            <h2 className="font-display text-lg font-bold text-navy-900">Message from leadership</h2>
            <div className="mt-3 flex gap-4">
              {extras.ceoPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={extras.ceoPhoto} alt={extras.ceoName ?? 'CEO'} className="h-14 w-14 shrink-0 rounded-full object-cover" />
              )}
              <div>
                <Quote className="h-5 w-5 text-teal-300" />
                <p className="mt-1 text-navy-700/80 italic">{extras.ceoMessage}</p>
                {extras.ceoName && <p className="mt-2 text-sm font-semibold text-navy-900">{extras.ceoName}</p>}
              </div>
            </div>
          </div>
        )}

        <h2 className="font-display text-xl font-bold text-navy-900">
          Open Jobs <Badge variant="muted">{openJobs.length}</Badge>
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {openJobs.map((job) => (
            <JobCard key={job.id} job={{ ...job, company: { name: company.name, logoUrl: company.logoUrl } }} />
          ))}
        </div>
        {openJobs.length === 0 && (
          <p className="mt-4 rounded-xl border bg-white p-12 text-center text-navy-700/60">No open jobs right now.</p>
        )}

        <CompanyReviews companyId={company.id} />

        {similar.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-xl font-bold text-navy-900">Similar companies</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {similar.map((c) => (
                <Link key={c.slug} href={`/companies/${c.slug}`} className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-teal-300 hover:shadow-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy-50">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-teal-600" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy-900">{c.name}</p>
                    <p className="truncate text-xs text-navy-700/60">{c.industry}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
