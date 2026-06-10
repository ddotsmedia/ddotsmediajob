import type { Metadata } from 'next';
import Link from 'next/link';
import { emirateBySlug, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';

export type Area = { slug: string; name: string; emirate: string; q: string; blurb: string };

export const AREAS: Area[] = [
  { slug: 'dubai-marina', name: 'Dubai Marina', emirate: 'dubai', q: 'marina', blurb: 'A waterfront district of high-rise offices, hospitality and retail — strong demand for sales, hospitality, real estate and customer-service roles.' },
  { slug: 'business-bay', name: 'Business Bay', emirate: 'dubai', q: 'business bay', blurb: 'A central commercial hub packed with corporate offices — common roles include admin, finance, sales, marketing and IT.' },
  { slug: 'jlt', name: 'JLT (Jumeirah Lake Towers)', emirate: 'dubai', q: 'jlt', blurb: 'A free-zone cluster (DMCC) of SMEs and startups — frequent openings in trading, finance, tech and admin.' },
  { slug: 'deira', name: 'Deira', emirate: 'dubai', q: 'deira', blurb: 'Old Dubai’s bustling trading quarter — retail, wholesale, logistics, driving and hospitality roles are common.' },
  { slug: 'bur-dubai', name: 'Bur Dubai', emirate: 'dubai', q: 'bur dubai', blurb: 'A busy commercial and residential area — retail, admin, healthcare and hospitality vacancies appear regularly.' },
  { slug: 'downtown-dubai', name: 'Downtown Dubai', emirate: 'dubai', q: 'downtown', blurb: 'Home to premium offices, hotels and retail around Burj Khalifa — hospitality, luxury retail and corporate roles.' },
  { slug: 'difc', name: 'DIFC', emirate: 'dubai', q: 'difc', blurb: 'Dubai’s financial free zone — banking, finance, legal, compliance and professional-services roles.' },
  { slug: 'al-barsha', name: 'Al Barsha', emirate: 'dubai', q: 'al barsha', blurb: 'A mixed commercial-residential area near Mall of the Emirates — retail, education, healthcare and admin roles.' },
  { slug: 'jumeirah', name: 'Jumeirah', emirate: 'dubai', q: 'jumeirah', blurb: 'An upscale coastal district — hospitality, beauty and wellness, education and household roles are common.' },
  { slug: 'al-ain', name: 'Al Ain', emirate: 'abu-dhabi', q: 'al ain', blurb: 'The Garden City inland from Abu Dhabi — education, healthcare, government-linked and retail roles.' },
  { slug: 'mussafah', name: 'Mussafah', emirate: 'abu-dhabi', q: 'mussafah', blurb: 'Abu Dhabi’s industrial heartland — manufacturing, construction, logistics, driving and technical roles.' },
  { slug: 'khalifa-city', name: 'Khalifa City', emirate: 'abu-dhabi', q: 'khalifa city', blurb: 'A growing residential and commercial area — admin, education, healthcare and retail vacancies.' },
  { slug: 'al-reem-island', name: 'Al Reem Island', emirate: 'abu-dhabi', q: 'reem island', blurb: 'A modern mixed-use island with corporate offices — finance, admin, real estate and hospitality roles.' },
];

export function parseArea(slug: string): Area | null {
  return AREAS.find((a) => a.slug === slug) ?? null;
}
export function areaStaticParams(): { emirate: string }[] {
  return AREAS.map((a) => ({ emirate: a.slug }));
}

async function load(area: Area) {
  const api = await getApi();
  const exact = (await api.jobs.list({ q: area.q, emirate: area.emirate, sort: 'newest', page: 1, perPage: 24 } as never).catch(() => ({ jobs: [], total: 0 }))) as { jobs: { id: string }[]; total: number };
  if (exact.jobs.length > 0) return { jobs: exact.jobs, total: exact.total, fallback: false };
  const near = (await api.jobs.list({ emirate: area.emirate, sort: 'newest', page: 1, perPage: 12 } as never).catch(() => ({ jobs: [], total: 0 }))) as { jobs: { id: string }[]; total: number };
  return { jobs: near.jobs, total: exact.total, fallback: true };
}

export async function areaMetadata(area: Area): Promise<Metadata> {
  const em = emirateBySlug(area.emirate)?.name ?? 'UAE';
  return {
    title: `Jobs in ${area.name} ${em} 2026 — Latest Vacancies`,
    description: `Find jobs in ${area.name}, ${em}. Latest vacancies near ${area.name} — apply free on ${SITE.name}.`,
    alternates: { canonical: `${SITE.url}/jobs-in/${area.slug}` },
  };
}

export async function AreaView({ area }: { area: Area }) {
  const em = emirateBySlug(area.emirate)?.name ?? 'UAE';
  const { jobs, total, fallback } = await load(area);

  const faq = [
    { q: `How many jobs are there in ${area.name}?`, a: `There are currently ${total} live vacancies tagged to ${area.name}, ${em} on DdotsMediaJobs, plus many more across ${em}.` },
    { q: `What jobs are common in ${area.name}?`, a: area.blurb },
    { q: `How do I find a job near ${area.name}?`, a: `Browse the listings on this page, set a free job alert for ${em}, and apply in one click. New roles are added daily.` },
  ];
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: `Jobs in ${em}`, item: `${SITE.url}/jobs-in/${area.emirate}` },
      { '@type': 'ListItem', position: 3, name: area.name, item: `${SITE.url}/jobs-in/${area.slug}` },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="text-xs text-navy-100/60"><Link href="/" className="hover:text-teal-400">Home</Link> › <Link href={`/jobs-in/${area.emirate}`} className="hover:text-teal-400">Jobs in {em}</Link> › <span>{area.name}</span></nav>
          <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Jobs in {area.name} {em} 2026</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">{area.blurb}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {fallback && (
          <p className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
            No jobs tagged specifically to {area.name} yet — showing the latest roles across {em}. <Link href="/employer/post" className="font-semibold underline">Be the first to post a job here</Link>.
          </p>
        )}
        {jobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">{jobs.map((j) => <JobCard key={j.id} job={j as never} />)}</div>
        ) : (
          <p className="rounded-xl border bg-white p-10 text-center text-navy-700/60">No live jobs right now. <Link href="/jobs" className="text-teal-600 hover:underline">Browse all jobs</Link>.</p>
        )}

        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-xl font-bold text-navy-900">Frequently asked questions</h2>
          <div className="mt-4 space-y-3">
            {faq.map((f) => (
              <div key={f.q} className="rounded-xl border bg-white p-4"><h3 className="font-semibold text-navy-900">{f.q}</h3><p className="mt-1 text-sm text-navy-700/70">{f.a}</p></div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-navy-900">Other areas in {em}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {AREAS.filter((a) => a.emirate === area.emirate && a.slug !== area.slug).map((a) => (
              <Link key={a.slug} href={`/jobs-in/${a.slug}`} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-700 hover:bg-teal-100">Jobs in {a.name}</Link>
            ))}
            <Link href={`/jobs-in/${area.emirate}`} className="rounded-full border border-navy-200 bg-white px-3 py-1 text-sm text-navy-700 hover:bg-navy-50">All jobs in {em}</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
