import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, BadgeCheck } from 'lucide-react';
import { emirateBySlug, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Companies Hiring in the UAE',
  description: 'Explore verified companies hiring across the UAE and browse their open jobs.',
  alternates: { canonical: `${SITE.url}/companies` },
};

export default async function CompaniesPage() {
  const api = await getApi();
  const companies = await api.content.companiesList().catch(() => []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-navy-900 md:text-4xl">Companies Hiring in the UAE</h1>
      <p className="mt-2 text-navy-700/70">Discover employers and their open roles.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <Link
            key={c.id}
            href={`/companies/${c.slug}`}
            className="group flex items-center gap-4 rounded-xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy-50">
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-teal-600" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h2 className="truncate font-display font-bold text-navy-900 group-hover:text-teal-600">{c.name}</h2>
                {c.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-teal-500" />}
              </div>
              <p className="text-sm text-navy-700/60">{c.industry ?? emirateBySlug(c.emirateSlug ?? '')?.name}</p>
              <Badge variant="muted" className="mt-1">{c.openJobs} open jobs</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
