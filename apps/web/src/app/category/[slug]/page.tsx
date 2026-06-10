import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES, categoryBySlug, EMIRATES, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';
import { CategoryIcon } from '@/components/category-icon';

export const revalidate = 600;
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) return { title: 'Category not found' };
  return {
    title: `${category.name} Jobs in UAE 2026 — Latest Vacancies`,
    description: `${category.description} Browse the latest ${category.name} jobs across Dubai, Abu Dhabi and all emirates. Visa-provided roles, apply free on ${SITE.name}.`,
    alternates: { canonical: `${SITE.url}/category/${slug}` },
  };
}

function categoryFaqs(name: string): { q: string; a: string }[] {
  return [
    { q: `How many ${name.toLowerCase()} jobs are available in the UAE?`, a: `New ${name.toLowerCase()} vacancies are posted daily across all seven emirates. See the live count and listings above, updated continuously on DdotsMediaJobs.` },
    { q: `What is the average ${name.toLowerCase()} salary in the UAE?`, a: `Pay depends on experience, qualifications and emirate. UAE salaries are tax-free. Check our salary guide for ${name.toLowerCase()} role-by-role AED ranges.` },
    { q: `Do ${name.toLowerCase()} jobs in the UAE provide a visa?`, a: `Many employers sponsor an employment visa for ${name.toLowerCase()} roles, often with medical insurance and Emirates ID. Look for the "Visa provided" badge on listings.` },
    { q: `How do I apply for ${name.toLowerCase()} jobs in the UAE?`, a: `Apply free on DdotsMediaJobs — one-click platform apply, direct WhatsApp, or email. No account is needed to apply via WhatsApp.` },
    { q: `Which emirate has the most ${name.toLowerCase()} jobs?`, a: `Dubai and Abu Dhabi typically have the highest demand, followed by Sharjah, but ${name.toLowerCase()} roles are posted across all seven emirates.` },
  ];
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  const api = await getApi();
  const { jobs, total } = await api.jobs
    .list({ category: slug, sort: 'newest', page: 1, perPage: 24 } as never)
    .catch(() => ({ jobs: [] as never[], total: 0 }));

  const faq = categoryFaqs(category.name);
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${SITE.url}/jobs` },
      { '@type': 'ListItem', position: 3, name: `${category.name} Jobs`, item: `${SITE.url}/category/${slug}` },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
              <CategoryIcon name={category.icon} className="h-7 w-7" />
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold text-white">{category.name} Jobs in the UAE</h1>
              <p className="mt-1 text-navy-100/70">{total.toLocaleString('en-AE')} open positions · {category.description}</p>
            </div>
          </div>
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
            No {category.name} jobs right now. <Link href="/jobs" className="text-teal-600 hover:underline">Browse all jobs</Link>.
          </p>
        )}
        <div className="mt-8 text-center">
          <Link href={`/jobs?category=${slug}`} className="font-semibold text-teal-600 hover:underline">
            See all {category.name} jobs with filters →
          </Link>
        </div>

        <div className="mt-12 border-t pt-8">
          <h2 className="font-display text-lg font-bold text-navy-900">{category.name} jobs by emirate</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {EMIRATES.map((e) => (
              <Link key={e.slug} href={`/jobs/${slug}-jobs-in-${e.slug}`} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-700 hover:bg-teal-100">
                {category.name} in {e.name}
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

        <RelatedCategories current={slug} />
      </div>
    </div>
  );
}

function RelatedCategories({ current }: { current: string }) {
  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="font-display text-lg font-bold text-navy-900">Explore other categories</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.filter((c) => c.slug !== current).map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="rounded-full border bg-white px-4 py-1.5 text-sm text-navy-700 hover:border-teal-300 hover:text-teal-600"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
