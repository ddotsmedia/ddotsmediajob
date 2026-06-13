'use client';

import { CalendarDays, Loader2, Video } from 'lucide-react';
import { trpc } from '@/trpc/react';

export default function CalendarPage() {
  const cal = trpc.employerAts.calendar.useQuery();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Interview calendar</h1></div>
      <p className="text-navy-700/60">All booked interviews, soonest first.</p>

      <div className="mt-5 space-y-2">
        {cal.isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-500" /></div>
          : !cal.data?.length ? <p className="rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No interviews booked yet.</p>
          : cal.data.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div>
                <p className="font-semibold text-navy-900">{i.candidateName ?? 'Candidate'} <span className="font-normal text-navy-700/60">· {i.jobTitle ?? 'Role'}</span></p>
                <p className="text-sm text-navy-700/60">{new Date(i.startTime).toLocaleString('en-AE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} – {new Date(i.endTime).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {i.zoomLink && <a href={i.zoomLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"><Video className="h-4 w-4" /> Join</a>}
            </div>
          ))}
      </div>
    </div>
  );
}
