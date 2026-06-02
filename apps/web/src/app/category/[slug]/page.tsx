import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES, categoryBySlug, SITE } from '@ddots/shared';
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
  const title = `${category.name} Jobs in the UAE`;
  return {
    title,
    description: `${category.description} Browse the latest ${category.name} vacancies across the UAE on ${SITE.name}.`,
    alternates: { canonical: `${SITE.url}/category/${slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  const api = await getApi();
  const { jobs, total } = await api.jobs
    .list({ category: slug, sort: 'newest', page: 1, perPage: 24 } as never)
    .catch(() => ({ jobs: [] as never[], total: 0 }));

  return (
    <div className="bg-navy-50/30">
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
