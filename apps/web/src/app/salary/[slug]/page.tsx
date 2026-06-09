import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categoryBySlug, emirateBySlug, SITE, EMIRATES, CATEGORIES } from '@ddots/shared';
import { getApi } from '@/trpc/server';

export const revalidate = 3600;

const ROLE_SLUGS = ['it', 'healthcare', 'finance', 'sales', 'construction', 'hospitality', 'driving', 'education', 'admin', 'manufacturing', 'security', 'beauty'];
const EMIRATE_SLUGS = EMIRATES.map((e) => e.slug);

function parse(slug: string): { role: string; emirate: string } | null {
  const m = slug.match(/^([a-z]+)-salary-in-([a-z-]+)$/);
  if (!m) return null;
  const [, role, emirate] = m;
  if (!ROLE_SLUGS.includes(role!) || !(EMIRATE_SLUGS as readonly string[]).includes(emirate!)) return null;
  return { role: role!, emirate: emirate! };
}

export function generateStaticParams(): { slug: string }[] {
  return ROLE_SLUGS.flatMap((c) => EMIRATE_SLUGS.map((e) => ({ slug: `${c}-salary-in-${e}` })));
}

type JobRow = { id: string; slug?: string; title?: string; salaryMin: number | null; salaryMax: number | null; company?: { name: string | null } | null };

async function load(role: string, emirate: string) {
  const api = await getApi();
  const res = (await api.jobs
    .list({ category: role, emirate, sort: 'newest', page: 1, perPage: 50 } as never)
    .catch(() => ({ jobs: [], total: 0 }))) as { jobs: JobRow[]; total: number };
  const jobs = res.jobs;
  const withSalary = jobs.filter((j) => j.salaryMin && j.salaryMax);
  const avgMin = withSalary.length ? Math.round(withSalary.reduce((s, j) => s + (j.salaryMin ?? 0), 0) / withSalary.length) : null;
  const avgMax = withSalary.length ? Math.round(withSalary.reduce((s, j) => s + (j.salaryMax ?? 0), 0) / withSalary.length) : null;
  const employers = [...new Set(jobs.map((j) => j.company?.name).filter((n): n is string => Boolean(n)))].slice(0, 8);
  return { total: res.total, avgMin, avgMax, employers };
}

const FALLBACK: Record<string, [number, number]> = {
  it: [8000, 22000], healthcare: [7000, 25000], finance: [9000, 28000], sales: [4000, 15000],
  construction: [3500, 14000], hospitality: [3000, 11000], driving: [2500, 6000], education: [5000, 18000],
  admin: [4000, 12000], manufacturing: [3500, 12000], security: [2500, 6000], beauty: [3000, 9000],
};

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-AE')}`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = parse(slug);
  if (!p) return {};
  const cat = categoryBySlug(p.role)!;
  const em = emirateBySlug(p.emirate)!;
  const { avgMin, avgMax } = await load(p.role, p.emirate);
  const [fMin, fMax] = FALLBACK[p.role]!;
  const lo = avgMin ?? fMin, hi = avgMax ?? fMax;
  const path = `/salary/${slug}`;
  return {
    title: `${cat.name} Salary in ${em.name} 2026 — ${aed(lo)}–${aed(hi)}/mo | DdotsMediaJobs`,
    description: `How much do ${cat.name.toLowerCase()} professionals earn in ${em.name}? Average ${aed(lo)}–${aed(hi)} per month in 2026, by experience level. See live ${cat.name.toLowerCase()} jobs in ${em.name}.`,
    alternates: { canonical: `${SITE.url}${path}` },
    openGraph: { title: `${cat.name} Salary in ${em.name} 2026`, url: `${SITE.url}${path}`, images: [`/api/og?title=${encodeURIComponent(`${cat.name} Salary in ${em.name}`)}&subtitle=${encodeURIComponent(`${aed(lo)}–${aed(hi)} / month`)}`] },
  };
}

export default async function SalaryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = parse(slug);
  if (!p) notFound();
  const cat = categoryBySlug(p.role)!;
  const em = emirateBySlug(p.emirate)!;
  const { total, avgMin, avgMax, employers } = await load(p.role, p.emirate);
  const [fMin, fMax] = FALLBACK[p.role]!;
  const lo = avgMin ?? fMin, hi = avgMax ?? fMax;
  const mid = Math.round((lo + hi) / 2);

  const levels = [
    { label: 'Entry / Fresher', min: lo, max: Math.round(lo + (mid - lo) * 0.6) },
    { label: 'Mid (3–5 yrs)', min: Math.round(lo + (mid - lo) * 0.6), max: mid },
    { label: 'Senior (5–10 yrs)', min: mid, max: Math.round(mid + (hi - mid) * 0.7) },
    { label: 'Lead / Manager', min: Math.round(mid + (hi - mid) * 0.7), max: hi },
  ];

  const faq = [
    { q: `What is the average ${cat.name.toLowerCase()} salary in ${em.name}?`, a: `In 2026, ${cat.name.toLowerCase()} roles in ${em.name} pay approximately ${aed(lo)}–${aed(hi)} per month, with a typical mid-point near ${aed(mid)}. Pay rises with experience, qualifications and employer.` },
    { q: `Do these salaries include benefits?`, a: `UAE salaries are often quoted as a basic figure. Many ${em.name} employers add housing or transport allowance, medical insurance, annual flight and a visa — always check the full package on each listing.` },
    { q: `Is ${cat.name.toLowerCase()} a good career in ${em.name}?`, a: `${em.name} has steady demand for ${cat.name.toLowerCase()} professionals. There are currently ${total} live ${cat.name.toLowerCase()} vacancies on DdotsMediaJobs, updated daily.` },
    { q: `How can I earn more as a ${cat.name.toLowerCase()} in ${em.name}?`, a: `Gaining UAE-recognised certifications, specialising, and moving into senior or managerial roles are the fastest routes. Use our AI Salary Coach to benchmark and negotiate an offer.` },
    { q: `Are ${cat.name.toLowerCase()} salaries in ${em.name} taxed?`, a: `The UAE levies no personal income tax on salaries, so your monthly figure is effectively take-home pay (excluding any voluntary deductions).` },
  ];

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Salary Guide', item: `${SITE.url}/salary-guide` },
      { '@type': 'ListItem', position: 3, name: `${cat.name} in ${em.name}`, item: `${SITE.url}/salary/${slug}` },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];

  const otherEmirates = EMIRATES.filter((e) => e.slug !== p.emirate).slice(0, 6);

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="text-xs text-navy-100/60"><Link href="/" className="hover:text-teal-400">Home</Link> › <Link href="/salary-guide" className="hover:text-teal-400">Salary Guide</Link> › <span>{cat.name} in {em.name}</span></nav>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">{cat.name} Salary in {em.name} 2026 — {aed(lo)}–{aed(hi)}/mo</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">Average monthly pay for {cat.name.toLowerCase()} professionals in {em.name}, broken down by experience level. Based on live DdotsMediaJobs listings and UAE market data.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Typical range</p><p className="font-display text-2xl font-bold text-teal-700">{aed(lo)}–{aed(hi)}</p></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Mid-point</p><p className="font-display text-2xl font-bold text-navy-900">{aed(mid)}</p></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-navy-700/60">Live vacancies</p><p className="font-display text-2xl font-bold text-navy-900">{total}</p></div>
        </div>

        <section className="mb-8 rounded-xl border bg-white p-5">
          <h2 className="font-display text-xl font-bold text-navy-900">Salary by experience level</h2>
          <div className="mt-4 space-y-3">
            {levels.map((l) => {
              const pct = Math.round(((l.max - lo) / (hi - lo || 1)) * 100);
              return (
                <div key={l.label}>
                  <div className="flex items-center justify-between text-sm"><span className="font-medium text-navy-900">{l.label}</span><span className="text-teal-700">{aed(l.min)}–{aed(l.max)}</span></div>
                  <div className="mt-1 h-2 w-full rounded-full bg-navy-100"><div className="h-2 rounded-full bg-teal-500" style={{ width: `${Math.min(100, Math.max(8, pct))}%` }} /></div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-navy-700/50">Indicative ranges. Actual pay depends on employer, qualifications and negotiation. UAE salaries are not subject to personal income tax.</p>
        </section>

        {employers.length > 0 && (
          <section className="mb-8 rounded-xl border bg-white p-5">
            <h2 className="font-display text-lg font-bold text-navy-900">Employers hiring {cat.name.toLowerCase()} in {em.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">{employers.map((e) => <span key={e} className="rounded-full border bg-navy-50 px-3 py-1 text-sm text-navy-700">{e}</span>)}</div>
          </section>
        )}

        <div className="mb-8">
          <Link href={`/jobs/${p.role}-jobs-in-${p.emirate}`} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700">View {total} open {cat.name.toLowerCase()} jobs in {em.name} →</Link>
        </div>

        <section className="mt-2 max-w-3xl">
          <h2 className="font-display text-xl font-bold text-navy-900">Frequently asked questions</h2>
          <div className="mt-4 space-y-3">
            {faq.map((f) => (
              <div key={f.q} className="rounded-xl border bg-white p-4"><h3 className="font-semibold text-navy-900">{f.q}</h3><p className="mt-1 text-sm text-navy-700/70">{f.a}</p></div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-navy-900">{cat.name} salary in other emirates</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {otherEmirates.map((e) => (
              <Link key={e.slug} href={`/salary/${p.role}-salary-in-${e.slug}`} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-700 hover:bg-teal-100">{cat.name} in {e.name}</Link>
            ))}
            <Link href="/salary-guide" className="rounded-full border border-navy-200 bg-white px-3 py-1 text-sm text-navy-700 hover:bg-navy-50">Full UAE salary guide</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
