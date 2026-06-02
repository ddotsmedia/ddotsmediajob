import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Building2, BadgeCheck, Globe } from 'lucide-react';
import { TRPCError } from '@trpc/server';
import { emirateBySlug, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';
import { CompanyReviews } from '@/components/company-reviews';
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
  const { company, openJobs } = data;

  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <Building2 className="h-9 w-9 text-teal-400" />
            )}
          </span>
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-white">
              {company.name}
              {company.isVerified && <BadgeCheck className="h-6 w-6 text-teal-400" />}
            </h1>
            <p className="mt-1 text-navy-100/70">
              {company.industry} {company.emirateSlug && `· ${emirateBySlug(company.emirateSlug)?.name}`}
            </p>
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-teal-300 hover:underline">
                <Globe className="h-4 w-4" /> Website
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {company.about && (
          <div className="mb-8 rounded-xl border bg-white p-6">
            <h2 className="font-display text-lg font-bold text-navy-900">About</h2>
            <p className="mt-2 text-navy-700/80">{company.about}</p>
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
      </div>
    </div>
  );
}
