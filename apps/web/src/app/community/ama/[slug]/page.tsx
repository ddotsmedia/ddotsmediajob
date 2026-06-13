import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TRPCError } from '@trpc/server';
import { User, Calendar, Building2 } from 'lucide-react';
import { getApi } from '@/trpc/server';
import { AmaQuestions } from './ama-questions';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  try {
    const api = await getApi();
    return await api.ama.bySlug({ slug });
  } catch (err) {
    if (err instanceof TRPCError && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: 'AMA not found' };
  return { title: `${data.session.topic} — AMA with ${data.session.expertName}`, description: data.session.description ?? undefined };
}

function ytEmbed(url: string) {
  return url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
}

export default async function AmaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { session } = data;

  return (
    <div className="bg-navy-50/30">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-6">
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
            {session.status === 'past' ? 'Recorded session' : session.status === 'live' ? '🔴 Live now' : 'Upcoming'}
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold text-navy-900 sm:text-3xl">{session.topic}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-navy-700/70">
            <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4 text-teal-600" /> {session.expertName}{session.expertTitle ? `, ${session.expertTitle}` : ''}</span>
            {session.expertCompany && <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-teal-600" /> {session.expertCompany}</span>}
            {session.scheduledAt && <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-teal-600" /> {new Date(session.scheduledAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
          </div>
          {session.description && <p className="mt-4 text-navy-700/80">{session.description}</p>}
        </div>

        {session.recordingUrl && (
          <div className="mt-6 overflow-hidden rounded-2xl border bg-white p-4">
            <div className="aspect-video overflow-hidden rounded-lg">
              {/youtube\.com|youtu\.be/.test(session.recordingUrl) ? (
                <iframe className="h-full w-full" src={ytEmbed(session.recordingUrl)} title="AMA recording" allowFullScreen />
              ) : (
                <video className="h-full w-full" src={session.recordingUrl} controls />
              )}
            </div>
          </div>
        )}

        {session.summary && (
          <div className="mt-6 rounded-2xl border bg-white p-6">
            <h2 className="font-display text-lg font-bold text-navy-900">Session summary</h2>
            <p className="mt-2 whitespace-pre-line text-navy-700/80">{session.summary}</p>
          </div>
        )}

        <div className="mt-6">
          <AmaQuestions slug={slug} sessionId={session.id} />
        </div>
      </div>
    </div>
  );
}
