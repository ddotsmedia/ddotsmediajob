'use client';

import { CalendarPlus } from 'lucide-react';

type Props = { title: string; description?: string | null; startsAt: string | Date; durationMin: number; url?: string | null };

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function AddToCalendar({ title, description, startsAt, durationMin, url }: Props) {
  function download() {
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + durationMin * 60_000);
    const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DdotsMediaJobs//Events//EN', 'BEGIN:VEVENT',
      `UID:${start.getTime()}@ddotsmediajobs.com`,
      `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc([description ?? '', url ? `Join: ${url}` : ''].filter(Boolean).join('\n'))}`,
      url ? `URL:${esc(url)}` : '', 'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href; a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`; a.click();
    URL.revokeObjectURL(href);
  }
  return (
    <button onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-50">
      <CalendarPlus className="h-4 w-4" /> Add to calendar
    </button>
  );
}
