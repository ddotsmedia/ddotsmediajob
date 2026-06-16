import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Clock, CalendarDays } from 'lucide-react';
import { emirateBySlug, categoryBySlug, formatSalary, SITE, EMIRATES } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';
import { WhatsappApplyButton } from '@/components/whatsapp-apply-button';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Walk-in Interviews UAE Today 2026 | DdotsMediaJobs',
  description:
    'Find walk-in interviews in Dubai, Abu Dhabi, Sharjah today. No appointment needed. Date, time and venue listed clearly — show up and get hired.',
  alternates: { canonical: '/walk-in-interviews' },
};

function fmtDate(d: string | null): { day: string; mon: string; full: string } | null {
  if (!d) return null;
  const date = new Date(`${d}T00:00:00`);
  return {
    day: date.toLocaleDateString('en-AE', { day: '2-digit' }),
    mon: date.toLocaleDateString('en-AE', { month: 'short' }),
    full: date.toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

export default async function WalkInPage({ searchParams }: { searchParams: Promise<{ emirate?: string }> }) {
  const { emirate } = await searchParams;
  const api = await getApi();
  const jobs = await api.jobs.walkIns({ limit: 60, emirate: emirate || undefined }).catch(() => []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: jobs.slice(0, 20).map((j, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: `Walk-in Interview: ${j.title}`,
        startDate: j.walkInDate ?? undefined,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: j.walkInVenue ?? emirateBySlug(j.emirateSlug)?.name, address: j.walkInVenue ?? undefined },
        organizer: { '@type': 'Organization', name: j.company?.name ?? 'Direct Employer' },
        url: `${SITE.url}/jobs/${j.slug}`,
      },
    })),
  };

  return (
    <div className="bg-gradient-to-b from-orange-50 to-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-navy-900">🚶 Walk-in Interviews in UAE 2026</h1>
        <p className="mt-2 text-navy-700/70">No appointment needed — show up and get hired.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <FilterChip label="All Emirates" href="/walk-in-interviews" active={!emirate} />
          {EMIRATES.map((e) => (
            <FilterChip key={e.slug} label={e.name} href={`/walk-in-interviews?emirate=${e.slug}`} active={emirate === e.slug} />
          ))}
        </div>

        {jobs.length === 0 ? (
          <div className="mt-10 rounded-xl border bg-white p-10 text-center">
            <p className="text-navy-700">No walk-in interviews currently listed. Check back tomorrow — new ones added daily.</p>
            <Link href="/jobs" className="mt-3 inline-block font-semibold text-teal-600 hover:underline">Browse all jobs →</Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {jobs.map((j) => {
              const d = fmtDate(j.walkInDate);
              const cat = categoryBySlug(j.categorySlug);
              return (
                <div key={j.id} className={`flex gap-4 rounded-xl border bg-white p-4 shadow-sm ${j.isFeatured ? 'border-l-4 border-l-orange-400' : ''}`}>
                  <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg bg-orange-500 text-white">
                    {d ? (<><span className="text-2xl font-bold leading-none">{d.day}</span><span className="text-xs uppercase">{d.mon}</span></>) : <CalendarDays className="h-7 w-7" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-bold text-navy-900"><Link href={`/jobs/${j.slug}`} className="hover:text-teal-600">{j.title}</Link></h2>
                      {j.isFeatured && <Badge className="bg-orange-100 text-orange-700">⭐ Featured</Badge>}
                      {cat && <Badge variant="muted">{cat.name}</Badge>}
                    </div>
                    <p className="text-sm text-navy-700/70">{j.company?.name ?? 'Direct Employer'} · {emirateBySlug(j.emirateSlug)?.name}{j.location ? `, ${j.location}` : ''}</p>
                    <div className="mt-2 space-y-0.5 text-sm text-navy-700">
                      {j.walkInTime && <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-orange-500" /> {j.walkInTime}</p>}
                      {j.walkInVenue && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-orange-500" /> {j.walkInVenue}</p>}
                      {j.walkInLastDate && <p className="text-xs text-navy-700/60">🗓️ Walk-in open until {fmtDate(j.walkInLastDate)?.full}</p>}
                      <p className="text-sm font-semibold text-teal-700">{formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <WhatsappApplyButton slug={j.slug} title={j.title} company={j.company?.name} applyWhatsapp={j.applyWhatsapp} contactWhatsapp={j.contactWhatsapp} label="WhatsApp for details" />
                      <Link href={`/jobs/${j.slug}`} className="rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">View Job →</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link href={href} className={`rounded-full border px-3 py-1 text-sm ${active ? 'border-orange-400 bg-orange-500 text-white' : 'border-navy-200 bg-white text-navy-700 hover:bg-orange-50'}`}>
      {label}
    </Link>
  );
}
