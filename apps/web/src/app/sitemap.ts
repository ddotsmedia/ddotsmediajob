import type { MetadataRoute } from 'next';
import { db, jobs, blogPosts, eq, desc } from '@ddots/db';
import { CATEGORIES, EMIRATES, SITE } from '@ddots/shared';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/jobs',
    '/companies',
    '/salary-guide',
    '/whatsapp-groups',
    '/blog',
    '/login',
    '/register',
  ].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: 'daily', priority: path === '' ? 1 : 0.8 }));

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${base}/category/${c.slug}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const emirateRoutes: MetadataRoute.Sitemap = EMIRATES.map((e) => ({
    url: `${base}/jobs-in/${e.slug}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const [activeJobs, posts, comps] = await Promise.all([
    db.query.jobs.findMany({
      where: eq(jobs.status, 'active'),
      columns: { slug: true, updatedAt: true },
      orderBy: [desc(jobs.publishedAt)],
      limit: 5000,
    }).catch(() => []),
    db.query.blogPosts.findMany({
      where: eq(blogPosts.isPublished, true),
      columns: { slug: true, updatedAt: true },
    }).catch(() => []),
    db.query.companies.findMany({ columns: { slug: true } }).catch(() => []),
  ]);

  const jobRoutes: MetadataRoute.Sitemap = activeJobs.map((j) => ({
    url: `${base}/jobs/${j.slug}`,
    lastModified: j.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  const companyRoutes: MetadataRoute.Sitemap = comps.map((c) => ({
    url: `${base}/companies/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticRoutes, ...categoryRoutes, ...emirateRoutes, ...jobRoutes, ...blogRoutes, ...companyRoutes];
}
