import type { Metadata } from 'next';
import { Quote, MapPin, Clock, Lightbulb } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: 'Success Stories — Hired in the UAE | DdotsMediaJobs' },
  description: 'Real jobseekers who landed roles across the UAE through DdotsMediaJobs. See how they did it, how long it took, and their tips for getting hired.',
  alternates: { canonical: `${SITE.url}/success-stories` },
};

export default async function SuccessStoriesPage() {
  const api = await getApi();
  const stories = await api.successStories.list().catch(() => [] as Awaited<ReturnType<typeof api.successStories.list>>);

  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">Success Stories</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">Real people, real jobs. See how UAE jobseekers landed their roles through DdotsMediaJobs.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {stories.length === 0 ? (
          <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">More stories coming soon. Get hired and you could be featured here.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {stories.map((s) => (
              <div key={s.id} className="rounded-xl border bg-white p-6">
                <Quote className="h-6 w-6 text-teal-300" />
                <p className="mt-2 text-navy-800">{s.story}</p>
                {s.tips && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-800"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /> {s.tips}</p>
                )}
                <div className="mt-4 border-t pt-4">
                  <p className="font-display font-bold text-navy-900">{s.seekerName}</p>
                  <p className="text-sm text-teal-700">{s.role}{s.company ? ` · ${s.company}` : ''}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-navy-700/60">
                    {s.emirate && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {s.emirate}</span>}
                    {s.timeToHire && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Hired in {s.timeToHire}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
