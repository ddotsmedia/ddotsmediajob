import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@ddots/auth';
import { emirateBySlug, categoryBySlug, CATEGORIES, EMIRATES } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Browse UAE Talent — Hire Candidates | DdotsMediaJobs',
  description: 'Browse pre-screened UAE jobseeker profiles across all industries. Filter by skills, emirate, availability and visa status.',
  robots: { index: false },
  alternates: { canonical: '/talent' },
};

const AVAIL: Record<string, string> = { actively_looking: '🟢 Actively Looking', open_to_work: '🟡 Open to Work', not_looking: '⚫ Not Looking' };

export default async function TalentDirectoryPage({ searchParams }: { searchParams: Promise<{ category?: string; emirate?: string; availability?: string; q?: string }> }) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== 'employer' && role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-navy-900">Browse UAE Talent</h1>
        <p className="mt-2 text-navy-700/70">The talent directory is for employers. Log in or create an employer account to browse candidates.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button asChild><Link href="/login?callbackUrl=/talent">Log in</Link></Button>
          <Button asChild variant="outline"><Link href="/register">Create employer account</Link></Button>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const availability = (['actively_looking', 'open_to_work', 'all'].includes(sp.availability ?? '') ? sp.availability : 'all') as 'actively_looking' | 'open_to_work' | 'all';
  const candidates = await (await getApi()).jobseekers
    .talentSearch({ category: sp.category || undefined, emirate: sp.emirate || undefined, availability, q: sp.q || undefined, page: 1 })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-navy-900">Browse UAE Talent</h1>
      <p className="mt-2 text-navy-700/70">Find pre-screened candidates across all industries.</p>

      <form className="mt-6 flex flex-wrap gap-2 rounded-xl border bg-white p-3" action="/talent" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Skills or headline…" className="min-w-[160px] flex-1 rounded-lg border border-navy-200 px-3 py-2 text-sm" />
        <select name="category" defaultValue={sp.category ?? ''} className="rounded-lg border border-navy-200 px-3 py-2 text-sm">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="emirate" defaultValue={sp.emirate ?? ''} className="rounded-lg border border-navy-200 px-3 py-2 text-sm">
          <option value="">All emirates</option>
          {EMIRATES.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
        </select>
        <select name="availability" defaultValue={availability} className="rounded-lg border border-navy-200 px-3 py-2 text-sm">
          <option value="all">Any availability</option>
          <option value="actively_looking">Actively looking</option>
          <option value="open_to_work">Open to work</option>
        </select>
        <Button type="submit">Search</Button>
      </form>

      {candidates.length === 0 ? (
        <p className="mt-10 rounded-xl border bg-white p-10 text-center text-navy-700/60">No candidates match these filters yet.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <div key={c.username} className="flex flex-col rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-navy-50">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-bold text-teal-600">{c.name.charAt(0)}</div>
                  )}
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
                {c.yearsExperience > 0 && <span>· {c.yearsExperience} yrs</span>}
                <span className="ml-auto">{AVAIL[c.availabilityStatus] ?? ''}</span>
              </div>
              {c.salary && (c.salary.min || c.salary.max) && (
                <p className="mt-2 text-xs font-semibold text-teal-700">AED {c.salary.min ?? '—'}–{c.salary.max ?? '—'}/mo</p>
              )}
              <Link href={`/talent/${c.username}`} className="mt-4 inline-flex items-center justify-center rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                View Profile →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
