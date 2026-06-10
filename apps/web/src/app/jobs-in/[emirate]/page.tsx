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
  return {
    title: `Jobs in ${emirate.name} 2026 — Live Vacancies`,
    description: `Find the latest jobs in ${emirate.name}, UAE 2026. Driver, nurse, accountant, sales, IT and engineering vacancies. Visa-provided roles, apply free on ${SITE.name}.`,
    alternates: { canonical: `${SITE.url}/jobs-in/${slug}` },
  };
}

const ROLE_SLUGS = ['it', 'healthcare', 'finance', 'sales', 'construction', 'driving'];

function emirateFaqs(name: string): { q: string; a: string }[] {
  return [
    { q: `What are the top companies hiring in ${name}?`, a: `${name} employers across technology, healthcare, finance, hospitality, construction and retail hire year-round — from large UAE groups to free-zone SMEs. Browse the live listings above for the companies recruiting now.` },
    { q: `What is the average salary in ${name}?`, a: `Salaries in ${name} vary by role and experience. Entry-level roles often start around AED 2,500–5,000/month, while skilled professionals earn AED 8,000–30,000+. UAE salaries are tax-free. See our salary guide for role-by-role data.` },
    { q: `How do I find a job in ${name} as a foreigner?`, a: `Apply to ${name} roles matching your skills on DdotsMediaJobs. Once selected, the employer sponsors your work permit and residence visa. Keep your CV, passport and certificates ready.` },
    { q: `What visa do I need to work in ${name}?`, a: `You need an employment (residence) visa sponsored by your employer. Many ${name} jobs are "visa provided" — the company covers the permit, medical and Emirates ID.` },
    { q: `Is it easy to find a job in ${name} in 2026?`, a: `${name} has an active hiring market with new vacancies daily. Strong demand exists in healthcare, tech, sales, construction and hospitality. A tailored CV and quick applications improve your chances.` },
  ];
}

export default async function EmiratePage({ params }: { params: Promise<{ emirate: string }> }) {
  const { emirate: slug } = await params;
  const emirate = emirateBySlug(slug);
  if (!emirate) notFound();

  const api = await getApi();
  const { jobs, total } = await api.jobs
    .list({ emirate: slug, sort: 'newest', page: 1, perPage: 24 } as never)
    .catch(() => ({ jobs: [] as never[], total: 0 }));

  const faq = emirateFaqs(emirate.name);
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${SITE.url}/jobs` },
      { '@type': 'ListItem', position: 3, name: `Jobs in ${emirate.name}`, item: `${SITE.url}/jobs-in/${slug}` },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Jobs in {emirate.name} 2026 — {total.toLocaleString('en-AE')} Live Jobs</h1>
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

        <div className="mt-10 border-t pt-8">
          <h2 className="font-display text-lg font-bold text-navy-900">Popular roles in {emirate.name}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => ROLE_SLUGS.includes(c.slug)).map((c) => (
              <Link key={c.slug} href={`/jobs/${c.slug}-jobs-in-${slug}`} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-700 hover:bg-teal-100">
                {c.name} in {emirate.name}
              </Link>
            ))}
          </div>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-navy-900">Frequently asked questions</h2>
          <div className="mt-4 space-y-3">
            {faq.map((f) => (
              <div key={f.q} className="rounded-xl border bg-white p-4"><h3 className="font-semibold text-navy-900">{f.q}</h3><p className="mt-1 text-sm text-navy-700/70">{f.a}</p></div>
            ))}
          </div>
        </section>

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
