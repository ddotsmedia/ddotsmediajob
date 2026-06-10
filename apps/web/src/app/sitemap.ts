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
    '/community',
    '/events',
    '/assessments',
    '/success-stories',
    '/market-insights',
    '/blog',
    '/login',
    '/register',
  ].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: 'daily', priority: path === '' ? 1 : 0.8 }));

  const toolRoutes: MetadataRoute.Sitemap = [
    '/golden-visa-checker',
    '/wps-calculator',
    '/cost-of-living',
    '/nafis-guide',
    '/visa-guide',
    '/jobs/freezone',
    '/jobs/remote',
    '/jobs/visa-provided',
    '/jobs/walk-in-interview-dubai',
    '/jobs/urgent-hiring-uae',
    '/jobs/fresher-jobs-uae',
    '/jobs/part-time-jobs-uae',
    '/jobs/female-jobs-uae',
    '/jobs/accommodation-provided-uae',
    '/jobs/gulf-jobs',
    '/jobs/jobs-for-indians-in-uae',
    '/jobs/jobs-for-filipinos-in-dubai',
    '/jobs/jobs-for-pakistanis-in-uae',
    '/compare',
    '/resources/relocation-advisor',
    '/resources/labour-rights',
    '/tools/career-transition',
    '/tools/negotiation-simulator',
    '/tools/ai-resume-builder',
    '/tools/ats-checker',
    '/tools/ai-mock-interview',
    '/tools/salary-calculator',
  ].map((path) => ({ url: `${base}${path}`, changeFrequency: 'weekly', priority: 0.6 }));

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

  const ROLE_SLUGS = ['it', 'healthcare', 'finance', 'sales', 'construction', 'hospitality', 'driving', 'education', 'admin', 'manufacturing', 'security', 'beauty'];
  const roleEmirateRoutes: MetadataRoute.Sitemap = ROLE_SLUGS.flatMap((c) =>
    EMIRATES.map((e) => ({ url: `${base}/jobs/${c}-jobs-in-${e.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  );

  const salaryRoutes: MetadataRoute.Sitemap = ROLE_SLUGS.flatMap((c) =>
    EMIRATES.map((e) => ({ url: `${base}/salary/${c}-salary-in-${e.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
  );

  const interviewRoutes: MetadataRoute.Sitemap = ROLE_SLUGS.map((c) => ({
    url: `${base}/interview-questions/${c}-in-uae`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...toolRoutes, ...categoryRoutes, ...emirateRoutes, ...roleEmirateRoutes, ...salaryRoutes, ...interviewRoutes, ...jobRoutes, ...blogRoutes, ...companyRoutes];
}
