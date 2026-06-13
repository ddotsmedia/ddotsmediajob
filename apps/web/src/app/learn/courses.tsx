'use client';

import { Clock, ExternalLink, TrendingUp } from 'lucide-react';
import { trpc } from '@/trpc/react';

export type Course = {
  id: string;
  name: string;
  provider: string;
  duration: string;
  price: string;
  skills: string[];
  url: string;
  inDemand?: boolean;
};

export function CourseGrid({ courses }: { courses: Course[] }) {
  const track = trpc.learn.trackClick.useMutation();

  function open(c: Course) {
    track.mutate({ courseId: c.id, provider: c.provider, url: c.url });
    const sep = c.url.includes('?') ? '&' : '?';
    window.open(`${c.url}${sep}utm_source=ddotsmediajobs&utm_medium=learn&utm_campaign=courses`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <div key={c.id} className="flex flex-col rounded-xl border bg-white p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">{c.provider}</p>
            {c.inDemand && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"><TrendingUp className="h-3 w-3" /> Employers value this</span>}
          </div>
          <h3 className="mt-1 font-display font-bold text-navy-900">{c.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.skills.slice(0, 4).map((s) => <span key={s} className="rounded-full bg-navy-50 px-2 py-0.5 text-xs text-navy-700">{s}</span>)}
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-navy-700/60">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.duration}</span>
            <span className="font-semibold text-navy-900">{c.price}</span>
          </div>
          <button onClick={() => open(c)} className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            View course <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
