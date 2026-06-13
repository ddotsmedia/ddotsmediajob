import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TRPCError } from '@trpc/server';
import { CalendarDays, Users, Clock } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { RsvpButton } from './rsvp-button';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  try {
    const api = await getApi();
    return await api.communityHub.eventBySlug({ slug });
  } catch (err) {
    if (err instanceof TRPCError && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: 'Event not found' };
  return { title: `${data.event.title} — DdotsMediaJobs Event`, description: data.event.description ?? undefined, alternates: { canonical: `${SITE.url}/community/events/${slug}` } };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { event, rsvpCount, hasRsvp } = data;

  return (
    <div className="bg-navy-50/30">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-6">
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">{event.eventType ?? 'Event'}</span>
          <h1 className="mt-3 font-display text-2xl font-bold text-navy-900 sm:text-3xl">{event.title}</h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-navy-700/70">
            {event.scheduledAt && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-teal-600" /> {new Date(event.scheduledAt).toLocaleString('en-AE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>}
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-teal-600" /> {event.durationMinutes} min</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-teal-600" /> {rsvpCount} attending</span>
          </div>
          {event.description && <p className="mt-4 whitespace-pre-line text-navy-700/80">{event.description}</p>}
          {event.summary && <div className="mt-4 rounded-lg bg-navy-50 p-4 text-sm text-navy-700/80"><p className="font-semibold text-navy-900">Summary</p><p className="mt-1 whitespace-pre-line">{event.summary}</p></div>}
          <div className="mt-6"><RsvpButton eventId={event.id} slug={slug} initialRsvp={hasRsvp} zoomLink={event.zoomLink} /></div>
        </div>
      </div>
    </div>
  );
}
