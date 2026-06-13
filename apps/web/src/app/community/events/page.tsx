import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Users } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';

export const metadata: Metadata = {
  title: 'UAE Career Events & Webinars — DdotsMediaJobs Community',
  description: 'Virtual career fairs, CV review sessions, AMAs and industry deep-dives for UAE job seekers. Free to join.',
  alternates: { canonical: `${SITE.url}/community/events` },
};

export const dynamic = 'force-dynamic';

function fmt(d: Date | string | null) { return d ? new Date(d).toLocaleString('en-AE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBD'; }

export default async function EventsPage() {
  const api = await getApi();
  const { upcoming, past } = await api.communityHub.listEvents();

  const Card = ({ e, recorded }: { e: { slug: string; title: string; eventType: string | null; scheduledAt: Date | string | null }; recorded?: boolean }) => (
    <Link href={`/community/events/${e.slug}`} className="rounded-xl border bg-white p-5 hover:border-teal-300 hover:shadow-sm">
      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">{e.eventType ?? 'Event'}</span>
      <h3 className="mt-2 font-display text-lg font-bold text-navy-900">{e.title}</h3>
      <p className="mt-1 text-sm text-navy-700/60">{recorded ? 'Recorded' : fmt(e.scheduledAt)}</p>
    </Link>
  );

  return (
    <div className="bg-navy-50/30">
      <section className="bg-navy-900 py-12 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"><CalendarDays className="h-4 w-4" /> Community events</span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Career events &amp; webinars</h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">Virtual career fairs, CV reviews, AMAs and industry deep-dives — free for the UAE community.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        <section>
          <h2 className="font-display text-2xl font-bold text-navy-900">Upcoming</h2>
          {upcoming.length === 0 ? <p className="mt-4 rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No upcoming events. Check back soon.</p>
            : <div className="mt-4 grid gap-4 sm:grid-cols-2">{upcoming.map((e) => <Card key={e.id} e={e} />)}</div>}
        </section>
        {past.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-bold text-navy-900">Past events</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">{past.map((e) => <Card key={e.id} e={e} recorded />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
