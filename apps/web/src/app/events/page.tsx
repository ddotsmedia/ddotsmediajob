import type { Metadata } from 'next';
import { CalendarDays, MapPin, Video, Users } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { AddToCalendar } from '@/components/events/add-to-calendar';

export const revalidate = 120;

export const metadata: Metadata = {
  title: { absolute: 'Virtual Hiring Events — UAE | DdotsMediaJobs' },
  description: 'Join upcoming virtual hiring events from UAE employers. Meet recruiters online, learn about open roles, and get hired faster.',
  alternates: { canonical: `${SITE.url}/events` },
};

const fmtDate = (d: Date) => new Intl.DateTimeFormat('en-AE', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Dubai' }).format(new Date(d));

export default async function EventsPage() {
  const api = await getApi();
  const events = await api.events.upcoming().catch(() => [] as Awaited<ReturnType<typeof api.events.upcoming>>);

  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">Virtual Hiring Events</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">Meet UAE employers online. Join a session, learn about open roles, and get noticed by recruiters.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {events.length === 0 ? (
          <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">No upcoming events right now. Check back soon.</p>
        ) : (
          <div className="space-y-4">
            {events.map((e) => (
              <div key={e.id} className="rounded-xl border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-navy-900">{e.title}</h2>
                    <p className="text-sm text-navy-700/60">{e.employer?.name ?? 'UAE Employer'}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700"><CalendarDays className="h-4 w-4" /> {fmtDate(e.startsAt)}</span>
                </div>
                {e.description && <p className="mt-2 text-sm text-navy-700/80">{e.description}</p>}
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-navy-700/60">
                  {e.emirate && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {e.emirate}</span>}
                  {e.rolesText && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {e.rolesText}</span>}
                  <span>{e.durationMin} min</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {e.meetingUrl && <a href={e.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"><Video className="h-4 w-4" /> Join</a>}
                  <AddToCalendar title={e.title} description={e.description} startsAt={e.startsAt} durationMin={e.durationMin} url={e.meetingUrl} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
