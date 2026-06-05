import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Briefcase, Languages as LangIcon } from 'lucide-react';
import { emirateBySlug, categoryBySlug, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

const AVAIL: Record<string, { label: string; cls: string }> = {
  actively_looking: { label: '🟢 Actively Looking', cls: 'bg-green-100 text-green-700' },
  open_to_work: { label: '🟡 Open to Work', cls: 'bg-amber-100 text-amber-700' },
  not_looking: { label: '⚫ Not Looking', cls: 'bg-navy-100 text-navy-600' },
};

async function load(username: string) {
  try {
    return await (await getApi()).jobseekers.publicProfile({ username });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const p = await load(username);
  if (!p) return { title: 'Talent profile', robots: { index: false } };
  const name = p.user?.name ?? 'Candidate';
  return {
    title: `${name}${p.headline ? ` — ${p.headline}` : ''} | DdotsMediaJobs Talent`,
    description: p.bio?.slice(0, 155) ?? `${name} — UAE candidate on DdotsMediaJobs.`,
    robots: { index: p.visibility === 'public', follow: p.visibility === 'public' },
    alternates: { canonical: `${SITE.url}/talent/${username}` },
  };
}

export default async function TalentProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const p = await load(username);
  if (!p) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-navy-900">Profile unavailable</h1>
        <p className="mt-2 text-navy-700/70">This profile is private, employers-only, or doesn't exist.</p>
        <Link href="/talent" className="mt-4 inline-block font-semibold text-teal-600 hover:underline">Browse talent →</Link>
      </div>
    );
  }
  const name = p.user?.name ?? 'Candidate';
  const emirate = emirateBySlug(p.emirateSlug ?? '');
  const category = categoryBySlug(p.categorySlug ?? '');
  const avail = AVAIL[p.availabilityStatus] ?? { label: '🟡 Open to Work', cls: 'bg-amber-100 text-amber-700' };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle: p.headline ?? undefined,
    address: emirate ? { '@type': 'PostalAddress', addressRegion: emirate.name, addressCountry: 'AE' } : undefined,
    knowsLanguage: p.languages?.length ? p.languages : undefined,
    url: `${SITE.url}/talent/${username}`,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-5">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full bg-navy-50">
            {p.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.user.image} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-teal-600">{name.charAt(0)}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-navy-900">{name}</h1>
            {p.headline && <p className="text-navy-700/80">{p.headline}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${avail.cls}`}>{avail.label}</span>
              {emirate && <span className="inline-flex items-center gap-1 text-navy-700/70"><MapPin className="h-3.5 w-3.5" /> {emirate.name}</span>}
              {p.visaStatus && <Badge variant="muted" className="capitalize">{String(p.visaStatus).replace('-', ' ')}</Badge>}
              {p.yearsExperience > 0 && <span className="inline-flex items-center gap-1 text-navy-700/70"><Briefcase className="h-3.5 w-3.5" /> {p.yearsExperience} yrs</span>}
            </div>
            {p.languages?.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-navy-700/70">
                <LangIcon className="h-3.5 w-3.5" /> {p.languages.join(' · ')}
              </div>
            )}
          </div>
        </div>

        {p.bio && (
          <div className="mt-6">
            <h2 className="font-display font-bold text-navy-900">About</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-navy-700/80">{p.bio}</p>
          </div>
        )}

        {p.skills?.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display font-bold text-navy-900">Skills</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.skills.map((s) => <Badge key={s} variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">{s}</Badge>)}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(p.salary?.min || p.salary?.max) && (
            <div className="rounded-lg border bg-navy-50/40 p-3 text-sm">
              <p className="text-navy-700/60">Expected salary</p>
              <p className="font-semibold text-navy-900">AED {p.salary.min ?? '—'}–{p.salary.max ?? '—'}/mo</p>
            </div>
          )}
          {category && (
            <div className="rounded-lg border bg-navy-50/40 p-3 text-sm">
              <p className="text-navy-700/60">Field</p>
              <p className="font-semibold text-navy-900">{category.name}</p>
            </div>
          )}
          {p.openToRelocate && (
            <div className="rounded-lg border bg-navy-50/40 p-3 text-sm">
              <p className="text-navy-700/60">Relocation</p>
              <p className="font-semibold text-navy-900">Open to relocate ✅</p>
            </div>
          )}
          {p.nationality && (
            <div className="rounded-lg border bg-navy-50/40 p-3 text-sm">
              <p className="text-navy-700/60">Nationality</p>
              <p className="font-semibold text-navy-900">{p.nationality}</p>
            </div>
          )}
        </div>

        {p.whatsapp && (
          <a href={`https://wa.me/${p.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1da851]">
            💬 WhatsApp {name.split(' ')[0]}
          </a>
        )}
      </div>

      {p.isOwner && (
        <p className="mt-3 text-center text-sm text-navy-700/60">
          This is your public profile. <Link href="/dashboard/profile" className="font-semibold text-teal-600 hover:underline">Edit it →</Link>
        </p>
      )}
    </div>
  );
}
