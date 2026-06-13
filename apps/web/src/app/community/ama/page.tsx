import type { Metadata } from 'next';
import Link from 'next/link';
import { Mic, Calendar, PlayCircle, User } from 'lucide-react';
import { getApi } from '@/trpc/server';

export const metadata: Metadata = {
  title: 'Ask Me Anything — UAE Career Experts',
  description: 'Live and recorded AMA sessions with UAE HR leaders, recruiters and career experts. Ask your questions free.',
  alternates: { canonical: 'https://ddotsmediajobs.com/community/ama' },
};

export const dynamic = 'force-dynamic';

function fmtDate(d: Date | string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function AmaListPage() {
  const api = await getApi();
  const { upcoming, past } = await api.ama.list();

  return (
    <div className="bg-navy-50/30">
      <section className="bg-navy-900 py-12 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"><Mic className="h-4 w-4" /> Community AMA</span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Ask UAE Career Experts Anything</h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">Live and recorded sessions with HR leaders, recruiters and industry experts across the UAE.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-12">
        {upcoming.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-bold text-navy-900">Upcoming sessions</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {upcoming.map((s) => (
                <Link key={s.id} href={`/community/ama/${s.slug}`} className="rounded-xl border bg-white p-5 hover:border-teal-300 hover:shadow-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">{s.status === 'live' ? '🔴 Live now' : 'Upcoming'}</span>
                  <h3 className="mt-2 font-display text-lg font-bold text-navy-900">{s.topic}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-navy-700/70"><User className="h-4 w-4" /> {s.expertName}{s.expertTitle ? `, ${s.expertTitle}` : ''}</p>
                  {s.scheduledAt && <p className="mt-1 flex items-center gap-1 text-xs text-navy-700/50"><Calendar className="h-3.5 w-3.5" /> {fmtDate(s.scheduledAt)}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display text-2xl font-bold text-navy-900">Past sessions</h2>
          {past.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No recorded sessions yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {past.map((s) => (
                <Link key={s.id} href={`/community/ama/${s.slug}`} className="rounded-xl border bg-white p-5 hover:border-teal-300 hover:shadow-sm">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700/50"><PlayCircle className="h-4 w-4" /> Watch recording</span>
                  <h3 className="mt-2 font-display text-lg font-bold text-navy-900">{s.topic}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-navy-700/70"><User className="h-4 w-4" /> {s.expertName}{s.expertTitle ? `, ${s.expertTitle}` : ''}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
