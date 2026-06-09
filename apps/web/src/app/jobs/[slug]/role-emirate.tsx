import type { Metadata } from 'next';
import Link from 'next/link';
import { categoryBySlug, emirateBySlug, formatSalary, SITE, EMIRATES } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';

// 12 real job categories (excludes free-zone slugs) × 7 emirates = 84 SEO pages.
const ROLE_SLUGS = ['it', 'healthcare', 'finance', 'sales', 'construction', 'hospitality', 'driving', 'education', 'admin', 'manufacturing', 'security', 'beauty'];
const EMIRATE_SLUGS = EMIRATES.map((e) => e.slug);

/** Parse "<role>-jobs-in-<emirate>" → { category, emirate } if valid, else null. */
export function parseRoleEmirate(slug: string): { category: string; emirate: string } | null {
  const m = slug.match(/^([a-z]+)-jobs-in-([a-z-]+)$/);
  if (!m) return null;
  const [, category, emirate] = m;
  if (!ROLE_SLUGS.includes(category!) || !(EMIRATE_SLUGS as readonly string[]).includes(emirate!)) return null;
  return { category: category!, emirate: emirate! };
}

export function roleEmirateStaticParams(): { slug: string }[] {
  return ROLE_SLUGS.flatMap((c) => EMIRATE_SLUGS.map((e) => ({ slug: `${c}-jobs-in-${e}` })));
}

type JobRow = { id: string; salaryMin: number | null; salaryMax: number | null };

async function load(category: string, emirate: string) {
  const api = await getApi();
  const res = (await api.jobs
    .list({ category, emirate, sort: 'newest', page: 1, perPage: 24 } as never)
    .catch(() => ({ jobs: [], total: 0 }))) as { jobs: JobRow[]; total: number };
  const jobs = res.jobs;
  const withSalary = jobs.filter((j) => j.salaryMin && j.salaryMax);
  const avgMin = withSalary.length ? Math.round(withSalary.reduce((s, j) => s + (j.salaryMin ?? 0), 0) / withSalary.length) : null;
  const avgMax = withSalary.length ? Math.round(withSalary.reduce((s, j) => s + (j.salaryMax ?? 0), 0) / withSalary.length) : null;
  return { jobs, total: res.total, avgMin, avgMax };
}

export async function roleEmirateMetadata(category: string, emirate: string): Promise<Metadata> {
  const cat = categoryBySlug(category)!;
  const em = emirateBySlug(emirate)!;
  const { total } = await load(category, emirate);
  const path = `/jobs/${category}-jobs-in-${emirate}`;
  return {
    title: `${cat.name} Jobs in ${em.name} 2026 — ${total} Vacancies | DdotsMediaJobs`,
    description: `Browse ${total} ${cat.name.toLowerCase()} jobs in ${em.name}. Visa-provided options, salaries shown, apply free in one click. Updated daily on DdotsMediaJobs.`,
    alternates: { canonical: `${SITE.url}${path}` },
    openGraph: { title: `${cat.name} Jobs in ${em.name}`, url: `${SITE.url}${path}`, images: [`/api/og?title=${encodeURIComponent(`${cat.name} Jobs in ${em.name}`)}&subtitle=${encodeURIComponent(`${total} live vacancies`)}`] },
  };
}

function faqs(catName: string, emName: string, total: number, avgMin: number | null, avgMax: number | null) {
  const salary = avgMin && avgMax ? `AED ${avgMin.toLocaleString('en-AE')}–${avgMax.toLocaleString('en-AE')}/month` : 'competitive, market-based salaries';
  return [
    { q: `How many ${catName.toLowerCase()} jobs are there in ${emName}?`, a: `There are currently ${total} live ${catName.toLowerCase()} vacancies in ${emName} on DdotsMediaJobs, updated daily as employers post new roles.` },
    { q: `What is the average ${catName.toLowerCase()} salary in ${emName}?`, a: `Based on live listings, ${catName.toLowerCase()} roles in ${emName} pay ${salary}. Salaries vary with experience, qualifications and the employer.` },
    { q: `Do ${catName.toLowerCase()} jobs in ${emName} provide a visa?`, a: `Many ${emName} employers sponsor an employment visa for ${catName.toLowerCase()} roles, often alongside medical insurance and Emirates ID. Use the "Visa provided" filter to see them.` },
    { q: `How do I apply for ${catName.toLowerCase()} jobs in ${emName}?`, a: `Apply free on DdotsMediaJobs — one-click platform apply, direct WhatsApp, or email. No account is required to apply via WhatsApp.` },
    { q: `Are there entry-level ${catName.toLowerCase()} jobs in ${emName}?`, a: `Yes. ${emName} has both fresher and experienced ${catName.toLowerCase()} openings. Filter by experience level or look for the "Fresher" badge on listings.` },
  ];
}

export async function RoleEmirateView({ category, emirate }: { category: string; emirate: string }) {
  const cat = categoryBySlug(category)!;
  const em = emirateBySlug(emirate)!;
  const { jobs, total, avgMin, avgMax } = await load(category, emirate);
  const faq = faqs(cat.name, em.name, total, avgMin, avgMax);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${SITE.url}/jobs` },
        { '@type': 'ListItem', position: 3, name: `${cat.name} in ${em.name}`, item: `${SITE.url}/jobs/${category}-jobs-in-${emirate}` },
      ],
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];

  const otherEmirates = EMIRATES.filter((e) => e.slug !== emirate).slice(0, 6);

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="text-xs text-navy-100/60"><Link href="/" className="hover:text-teal-400">Home</Link> › <Link href="/jobs" className="hover:text-teal-400">Jobs</Link> › <span>{cat.name} in {em.name}</span></nav>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">{cat.name} Jobs in {em.name} — {total} Live Vacancies</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">
            Browse the latest {cat.name.toLowerCase()} jobs in {em.name}, United Arab Emirates. New roles are added daily — apply free in one click, via WhatsApp, or by email.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Live vacancies</p><p className="font-display text-2xl font-bold text-navy-900">{total}</p></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Average salary</p><p className="font-display text-2xl font-bold text-teal-700">{avgMin && avgMax ? `AED ${avgMin.toLocaleString('en-AE')}–${avgMax.toLocaleString('en-AE')}` : '—'}</p></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Location</p><p className="font-display text-2xl font-bold text-navy-900">{em.name}</p></div>
        </div>

        <article className="mb-8 max-w-3xl space-y-3 text-sm leading-relaxed text-navy-700/80">
          <p>{em.name} is one of the UAE&apos;s most active hiring markets for {cat.name.toLowerCase()} professionals. Whether you are an experienced specialist or starting your career, employers across {em.name} are recruiting year-round — from established UAE groups to fast-growing SMEs and free-zone companies.</p>
          <p>On this page you will find every live {cat.name.toLowerCase()} vacancy in {em.name} currently posted on DdotsMediaJobs. Each listing shows the salary (where disclosed), whether a visa and accommodation are provided, the job type, and how to apply. Many employers sponsor an employment visa, cover medical insurance, and assist with Emirates ID — check each listing for details.</p>
          <p>Salaries for {cat.name.toLowerCase()} roles in {em.name} depend on your experience, qualifications and the employer. {avgMin && avgMax ? `Across current listings the typical range is AED ${avgMin.toLocaleString('en-AE')}–${avgMax.toLocaleString('en-AE')} per month.` : 'Salaries are competitive and set by the market.'} For a deeper breakdown by experience level, see our UAE Salary Guide.</p>
          <p>Applying is free and fast: use one-click platform apply to track your application, message the employer directly on WhatsApp, or send your CV by email. You do not need an account to apply via WhatsApp, making it ideal for jobseekers on mobile.</p>
        </article>

        {jobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">{jobs.map((job: { id: string }) => <JobCard key={job.id} job={job as never} />)}</div>
        ) : (
          <p className="rounded-xl border bg-white p-10 text-center text-navy-700/60">No live {cat.name.toLowerCase()} jobs in {em.name} right now. <Link href="/jobs" className="text-teal-600 hover:underline">Browse all jobs</Link> or check back tomorrow.</p>
        )}

        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-xl font-bold text-navy-900">Frequently asked questions</h2>
          <div className="mt-4 space-y-3">
            {faq.map((f) => (
              <div key={f.q} className="rounded-xl border bg-white p-4">
                <h3 className="font-semibold text-navy-900">{f.q}</h3>
                <p className="mt-1 text-sm text-navy-700/70">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-navy-900">{cat.name} jobs in other emirates</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {otherEmirates.map((e) => (
              <Link key={e.slug} href={`/jobs/${category}-jobs-in-${e.slug}`} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-700 hover:bg-teal-100">
                {cat.name} in {e.name}
              </Link>
            ))}
            <Link href={`/category/${category}`} className="rounded-full border border-navy-200 bg-white px-3 py-1 text-sm text-navy-700 hover:bg-navy-50">All {cat.name} jobs</Link>
            <Link href={`/jobs-in/${emirate}`} className="rounded-full border border-navy-200 bg-white px-3 py-1 text-sm text-navy-700 hover:bg-navy-50">All jobs in {em.name}</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
