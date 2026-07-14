import type { Metadata } from 'next';
import Link from 'next/link';
import { emirateBySlug, categoryBySlug, CATEGORIES, EMIRATES, VISA_STATUS, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Find Talent in UAE — Free | DdotsMediaJobs',
  description: 'Browse CVs from professionals across all 7 emirates. Free to browse, contact directly via WhatsApp. Filter by role, emirate, visa status and availability.',
  alternates: { canonical: `${SITE.url}/talent` },
};

const AVAIL: Record<string, string> = { actively_looking: '🟢 Actively Looking', open_to_work: '🟡 Open to Work', not_looking: '⚫ Not Looking' };

export default async function TalentDirectoryPage({ searchParams }: { searchParams: Promise<{ category?: string; emirate?: string; availability?: string; visaStatus?: string; page?: string }> }) {
  const sp = await searchParams;
  const availability = (['actively_looking', 'open_to_work', 'all'].includes(sp.availability ?? '') ? sp.availability : 'all') as 'actively_looking' | 'open_to_work' | 'all';
  const page = Math.max(1, Number(sp.page) || 1);
  const api = await getApi();
  const [data, stats] = await Promise.all([
    api.jobseekers.browse({ category: sp.category || undefined, emirate: sp.emirate || undefined, visaStatus: sp.visaStatus || undefined, availability, page }).catch(() => ({ candidates: [], total: 0, page: 1, perPage: 20, totalPages: 0 })),
    api.jobseekers.browseStats().catch(() => ({ registered: 0, openToWork: 0 })),
  ]);

  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (sp.category) p.set('category', sp.category);
    if (sp.emirate) p.set('emirate', sp.emirate);
    if (sp.visaStatus) p.set('visaStatus', sp.visaStatus);
    if (availability !== 'all') p.set('availability', availability);
    for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
    return `/talent?${p.toString()}`;
  };

  return (
    <div>
      {/* Hero */}
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">Find Talent in UAE — Free</h1>
          <p className="mx-auto mt-2 max-w-2xl text-navy-100/70">Browse CVs from professionals across all 7 emirates. Contact directly via WhatsApp.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-teal-300">
            <span>{stats.registered.toLocaleString('en-AE')} Registered Professionals</span>
            <span className="text-navy-100/30">·</span>
            <span>{stats.openToWork.toLocaleString('en-AE')} Open to Work</span>
            <span className="text-navy-100/30">·</span>
            <span>Free to Contact</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Filters */}
        <form className="flex flex-wrap gap-2 rounded-xl border bg-white p-3" action="/talent" method="get">
          <select name="category" defaultValue={sp.category ?? ''} className="min-w-[150px] flex-1 rounded-lg border border-navy-200 px-3 py-2 text-sm"><option value="">All roles</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
          <select name="emirate" defaultValue={sp.emirate ?? ''} className="rounded-lg border border-navy-200 px-3 py-2 text-sm"><option value="">All emirates</option>{EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</select>
          <select name="visaStatus" defaultValue={sp.visaStatus ?? ''} className="rounded-lg border border-navy-200 px-3 py-2 text-sm capitalize"><option value="">Any visa</option>{VISA_STATUS.map((v) => <option key={v} value={v}>{v.replace(/-/g, ' ')}</option>)}</select>
          <select name="availability" defaultValue={availability} className="rounded-lg border border-navy-200 px-3 py-2 text-sm"><option value="all">Any availability</option><option value="actively_looking">Actively looking</option><option value="open_to_work">Open to work</option></select>
          <Button type="submit">Filter</Button>
        </form>

        {data.candidates.length === 0 ? (
          <p className="mt-10 rounded-xl border bg-white p-10 text-center text-navy-700/60">No public candidate profiles match these filters yet.</p>
        ) : (
          <>
            <p className="mt-6 text-sm text-navy-700/60">{data.total.toLocaleString('en-AE')} professionals</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.candidates.map((c) => (
                <div key={c.username} className="flex flex-col rounded-xl border bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-50 font-bold text-teal-600">
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt="" className="h-full w-full object-cover" />
                      ) : c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display font-bold text-navy-900">{c.name}</p>
                      <p className="truncate text-xs text-navy-700/70">{c.headline ?? categoryBySlug(c.categorySlug ?? '')?.name ?? 'Candidate'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.skills.map((s) => <Badge key={s} variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">{s}</Badge>)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-navy-700/70">
                    <span>{emirateBySlug(c.emirateSlug ?? '')?.name ?? 'UAE'}</span>
                    <span className="text-navy-300">·</span>
                    <span>{AVAIL[c.availabilityStatus] ?? ''}</span>
                    {c.yearsExperience > 0 && <><span className="text-navy-300">·</span><span>{c.yearsExperience} yrs</span></>}
                  </div>
                  <Link href={`/talent/${c.username}`} className="mt-4 inline-flex items-center justify-center rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">View Profile →</Link>
                  <p className="mt-2 text-center text-[11px] text-navy-700/40">Phone &amp; email visible after login</p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                {page > 1 && <Button asChild variant="outline"><Link href={qs({ page: page - 1 })}>← Previous</Link></Button>}
                <span className="text-sm text-navy-700/60">Page {page} of {data.totalPages}</span>
                {page < data.totalPages && <Button asChild variant="outline"><Link href={qs({ page: page + 1 })}>Next →</Link></Button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
