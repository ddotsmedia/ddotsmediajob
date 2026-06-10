import type { Metadata } from 'next';
import Link from 'next/link';
import { emirateBySlug, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';

type RolePage = { slug: string; q: string; role: string; emirate?: string };

/** Specific job-title SEO pages. Slugs avoid the [category]-jobs-in-[emirate] format owned by role-emirate. */
const ROLE_PAGES: RolePage[] = [
  { slug: 'driver-jobs-in-dubai', q: 'driver', role: 'Driver', emirate: 'dubai' },
  { slug: 'driver-jobs-in-abu-dhabi', q: 'driver', role: 'Driver', emirate: 'abu-dhabi' },
  { slug: 'nurse-jobs-in-dubai', q: 'nurse', role: 'Nurse', emirate: 'dubai' },
  { slug: 'nurse-jobs-in-abu-dhabi', q: 'nurse', role: 'Nurse', emirate: 'abu-dhabi' },
  { slug: 'accountant-jobs-in-dubai', q: 'accountant', role: 'Accountant', emirate: 'dubai' },
  { slug: 'accountant-jobs-in-uae', q: 'accountant', role: 'Accountant' },
  { slug: 'receptionist-jobs-in-dubai', q: 'receptionist', role: 'Receptionist', emirate: 'dubai' },
  { slug: 'receptionist-jobs-in-uae', q: 'receptionist', role: 'Receptionist' },
  { slug: 'data-entry-jobs-in-dubai', q: 'data entry', role: 'Data Entry', emirate: 'dubai' },
  { slug: 'data-entry-jobs-in-uae', q: 'data entry', role: 'Data Entry' },
  { slug: 'hr-jobs-in-dubai', q: 'hr', role: 'HR', emirate: 'dubai' },
  { slug: 'hr-manager-jobs-uae', q: 'hr manager', role: 'HR Manager' },
  { slug: 'civil-engineer-jobs-in-uae', q: 'civil engineer', role: 'Civil Engineer' },
  { slug: 'civil-engineer-jobs-dubai', q: 'civil engineer', role: 'Civil Engineer', emirate: 'dubai' },
  { slug: 'software-developer-jobs-dubai', q: 'software', role: 'Software Developer', emirate: 'dubai' },
  { slug: 'sales-executive-jobs-dubai', q: 'sales executive', role: 'Sales Executive', emirate: 'dubai' },
  { slug: 'sales-jobs-uae', q: 'sales', role: 'Sales', emirate: undefined },
  { slug: 'teacher-jobs-uae', q: 'teacher', role: 'Teacher' },
  { slug: 'teacher-jobs-dubai', q: 'teacher', role: 'Teacher', emirate: 'dubai' },
  { slug: 'security-guard-jobs-dubai', q: 'security guard', role: 'Security Guard', emirate: 'dubai' },
  { slug: 'security-jobs-uae', q: 'security', role: 'Security' },
  { slug: 'electrician-jobs-dubai', q: 'electrician', role: 'Electrician', emirate: 'dubai' },
  { slug: 'electrician-jobs-uae', q: 'electrician', role: 'Electrician' },
  { slug: 'carpenter-jobs-dubai', q: 'carpenter', role: 'Carpenter', emirate: 'dubai' },
  { slug: 'plumber-jobs-uae', q: 'plumber', role: 'Plumber' },
  { slug: 'chef-jobs-dubai', q: 'chef', role: 'Chef', emirate: 'dubai' },
  { slug: 'cook-jobs-uae', q: 'cook', role: 'Cook' },
  { slug: 'pharmacist-jobs-uae', q: 'pharmacist', role: 'Pharmacist' },
  { slug: 'doctor-jobs-dubai', q: 'doctor', role: 'Doctor', emirate: 'dubai' },
  { slug: 'mechanical-engineer-jobs-uae', q: 'mechanical engineer', role: 'Mechanical Engineer' },
  { slug: 'digital-marketing-jobs-dubai', q: 'digital marketing', role: 'Digital Marketing', emirate: 'dubai' },
  { slug: 'graphic-designer-jobs-dubai', q: 'graphic designer', role: 'Graphic Designer', emirate: 'dubai' },
  { slug: 'customer-service-jobs-dubai', q: 'customer service', role: 'Customer Service', emirate: 'dubai' },
  { slug: 'warehouse-jobs-dubai', q: 'warehouse', role: 'Warehouse', emirate: 'dubai' },
  { slug: 'logistics-jobs-uae', q: 'logistics', role: 'Logistics' },
  { slug: 'heavy-driver-jobs-uae', q: 'heavy driver', role: 'Heavy Driver' },
  { slug: 'delivery-driver-jobs-dubai', q: 'delivery driver', role: 'Delivery Driver', emirate: 'dubai' },
  { slug: 'forklift-operator-jobs-dubai', q: 'forklift', role: 'Forklift Operator', emirate: 'dubai' },
  { slug: 'housekeeping-jobs-dubai', q: 'housekeeping', role: 'Housekeeping', emirate: 'dubai' },
  { slug: 'hotel-jobs-uae', q: 'hotel', role: 'Hotel', emirate: undefined },
  { slug: 'nanny-jobs-dubai', q: 'nanny', role: 'Nanny', emirate: 'dubai' },
  { slug: 'babysitter-jobs-uae', q: 'babysitter', role: 'Babysitter' },
];

export function parseRolePage(slug: string): RolePage | null {
  return ROLE_PAGES.find((p) => p.slug === slug) ?? null;
}
export function rolePageStaticParams(): { slug: string }[] {
  return ROLE_PAGES.map((p) => ({ slug: p.slug }));
}

const emName = (p: RolePage) => (p.emirate ? emirateBySlug(p.emirate)?.name ?? 'UAE' : 'UAE');

type JobRow = { id: string; salaryMin: number | null; salaryMax: number | null };
async function load(p: RolePage) {
  const api = await getApi();
  const res = (await api.jobs
    .list({ q: p.q, emirate: p.emirate, sort: 'newest', page: 1, perPage: 24 } as never)
    .catch(() => ({ jobs: [], total: 0 }))) as { jobs: JobRow[]; total: number };
  const withSalary = res.jobs.filter((j) => j.salaryMin && j.salaryMax);
  const avgMin = withSalary.length ? Math.round(withSalary.reduce((s, j) => s + (j.salaryMin ?? 0), 0) / withSalary.length) : null;
  const avgMax = withSalary.length ? Math.round(withSalary.reduce((s, j) => s + (j.salaryMax ?? 0), 0) / withSalary.length) : null;
  return { jobs: res.jobs, total: res.total, avgMin, avgMax };
}

export async function rolePageMetadata(p: RolePage): Promise<Metadata> {
  const { total } = await load(p);
  const em = emName(p);
  return {
    title: { absolute: `${p.role} Jobs in ${em} 2026 — ${total} Vacancies | DdotsMediaJobs` },
    description: `Browse ${total} ${p.role.toLowerCase()} jobs in ${em}. Latest vacancies, salaries shown, visa-provided options. Apply free on DdotsMediaJobs.`,
    alternates: { canonical: `${SITE.url}/jobs/${p.slug}` },
  };
}

export async function RolePageView({ page }: { page: RolePage }) {
  const { jobs, total, avgMin, avgMax } = await load(page);
  const em = emName(page);
  const salary = avgMin && avgMax ? `AED ${avgMin.toLocaleString('en-AE')}–${avgMax.toLocaleString('en-AE')}/month` : 'competitive, market-based salaries';

  const faq = [
    { q: `What is the salary for a ${page.role.toLowerCase()} in ${em}?`, a: `Based on live listings, ${page.role.toLowerCase()} roles in ${em} pay ${salary}. Pay varies with experience, qualifications and employer. UAE salaries are tax-free.` },
    { q: `How many ${page.role.toLowerCase()} jobs are available in ${em}?`, a: `There are currently ${total} live ${page.role.toLowerCase()} vacancies in ${em} on DdotsMediaJobs, updated daily.` },
    { q: `Do ${page.role.toLowerCase()} jobs in ${em} provide a visa?`, a: `Many employers sponsor an employment visa for ${page.role.toLowerCase()} roles, often with medical insurance and Emirates ID. Look for the "Visa provided" badge.` },
    { q: `How do I apply for ${page.role.toLowerCase()} jobs in ${em}?`, a: `Apply free on DdotsMediaJobs — one-click platform apply, direct WhatsApp, or email. No account needed to apply via WhatsApp.` },
  ];

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${SITE.url}/jobs` },
      { '@type': 'ListItem', position: 3, name: `${page.role} in ${em}`, item: `${SITE.url}/jobs/${page.slug}` },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];

  const related = ROLE_PAGES.filter((r) => r.slug !== page.slug && (r.role === page.role || r.emirate === page.emirate)).slice(0, 6);

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="text-xs text-navy-100/60"><Link href="/" className="hover:text-teal-400">Home</Link> › <Link href="/jobs" className="hover:text-teal-400">Jobs</Link> › <span>{page.role} in {em}</span></nav>
          <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl">{page.role} Jobs in {em} 2026 — {total} Vacancies</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">Latest {page.role.toLowerCase()} vacancies in {em}, updated daily. Apply free in one click, via WhatsApp, or by email.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Live vacancies</p><p className="font-display text-2xl font-bold text-navy-900">{total}</p></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Average salary</p><p className="font-display text-2xl font-bold text-teal-700">{avgMin && avgMax ? `AED ${avgMin.toLocaleString('en-AE')}–${avgMax.toLocaleString('en-AE')}` : '—'}</p></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Location</p><p className="font-display text-2xl font-bold text-navy-900">{em}</p></div>
        </div>

        <article className="mb-8 max-w-3xl space-y-3 text-sm leading-relaxed text-navy-700/80">
          <p>{em} has steady demand for {page.role.toLowerCase()} professionals across a range of employers. Whether you are experienced or starting out, new {page.role.toLowerCase()} roles are posted regularly — many include visa sponsorship, medical insurance and other benefits.</p>
          <p>This page shows every live {page.role.toLowerCase()} vacancy in {em} currently on DdotsMediaJobs. Each listing shows the salary where disclosed, the job type, and how to apply. {avgMin && avgMax ? `Across current listings the typical pay is ${salary}.` : 'Salaries are competitive and set by the market.'}</p>
        </article>

        {jobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">{jobs.map((j) => <JobCard key={j.id} job={j as never} />)}</div>
        ) : (
          <p className="rounded-xl border bg-white p-10 text-center text-navy-700/60">No live {page.role.toLowerCase()} jobs in {em} right now. <Link href="/jobs" className="text-teal-600 hover:underline">Browse all jobs</Link> or check back tomorrow.</p>
        )}

        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-xl font-bold text-navy-900">Frequently asked questions</h2>
          <div className="mt-4 space-y-3">
            {faq.map((f) => (
              <div key={f.q} className="rounded-xl border bg-white p-4"><h3 className="font-semibold text-navy-900">{f.q}</h3><p className="mt-1 text-sm text-navy-700/70">{f.a}</p></div>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-bold text-navy-900">Related searches</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {related.map((r) => (
                <Link key={r.slug} href={`/jobs/${r.slug}`} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-700 hover:bg-teal-100">{r.role} in {emName(r)}</Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
