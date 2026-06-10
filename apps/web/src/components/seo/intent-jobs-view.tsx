import Link from 'next/link';
import { SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';

export type IntentConfig = {
  h1: string;
  subtitle: string;
  intro: string[];
  listInput: Record<string, unknown>;
  faq: { q: string; a: string }[];
  canonical: string; // path, e.g. /jobs/urgent-hiring-uae
  extra?: React.ReactNode;
};

/** Popular intent links shown on every SEO intent page (internal linking). */
const POPULAR: { href: string; label: string }[] = [
  { href: '/jobs/walk-in-interview-dubai', label: 'Walk-in Interviews Dubai' },
  { href: '/jobs/urgent-hiring-uae', label: 'Urgent Hiring UAE' },
  { href: '/jobs/fresher-jobs-uae', label: 'Fresher Jobs UAE' },
  { href: '/jobs/part-time-jobs-uae', label: 'Part-Time Jobs UAE' },
  { href: '/jobs/accommodation-provided-uae', label: 'Free Accommodation Jobs' },
  { href: '/jobs/visa-provided', label: 'Visa Provided Jobs' },
  { href: '/jobs/remote', label: 'Work From Home UAE' },
  { href: '/jobs/jobs-for-indians-in-uae', label: 'Jobs for Indians in UAE' },
  { href: '/jobs/jobs-for-filipinos-in-dubai', label: 'Jobs for Filipinos in Dubai' },
];

export async function IntentJobsView({ config }: { config: IntentConfig }) {
  const api = await getApi();
  const res = (await api.jobs
    .list({ sort: 'newest', page: 1, perPage: 24, ...config.listInput } as never)
    .catch(() => ({ jobs: [], total: 0 }))) as { jobs: { id: string }[]; total: number };
  const { jobs, total } = res;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${SITE.url}/jobs` },
        { '@type': 'ListItem', position: 3, name: config.h1, item: `${SITE.url}${config.canonical}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: config.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="text-xs text-navy-100/60"><Link href="/" className="hover:text-teal-400">Home</Link> › <Link href="/jobs" className="hover:text-teal-400">Jobs</Link> › <span>{config.h1}</span></nav>
          <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl">{config.h1}</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">{config.subtitle}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Live vacancies</p><p className="font-display text-2xl font-bold text-navy-900">{total.toLocaleString('en-AE')}</p></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Apply</p><p className="font-display text-2xl font-bold text-teal-700">Free · 1-click</p></div>
        </div>

        <article className="mb-8 max-w-3xl space-y-3 text-sm leading-relaxed text-navy-700/80">
          {config.intro.map((p, i) => <p key={i}>{p}</p>)}
        </article>

        {config.extra}

        {jobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">{jobs.map((j) => <JobCard key={j.id} job={j as never} />)}</div>
        ) : (
          <p className="rounded-xl border bg-white p-10 text-center text-navy-700/60">No matching live jobs right now. <Link href="/jobs" className="text-teal-600 hover:underline">Browse all jobs</Link> or check back tomorrow.</p>
        )}

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-navy-900">Frequently asked questions</h2>
          <div className="mt-4 space-y-3">
            {config.faq.map((f) => (
              <div key={f.q} className="rounded-xl border bg-white p-4"><h3 className="font-semibold text-navy-900">{f.q}</h3><p className="mt-1 text-sm text-navy-700/70">{f.a}</p></div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-navy-900">Popular searches</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR.filter((p) => p.href !== config.canonical).map((p) => (
              <Link key={p.href} href={p.href} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-700 hover:bg-teal-100">{p.label}</Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
