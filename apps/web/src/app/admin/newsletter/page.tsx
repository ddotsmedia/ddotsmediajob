'use client';

import { Mail, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

export default function NewsletterPage() {
  const gen = trpc.communityHub.generateNewsletter.useQuery();
  function copy(t: string) { navigator.clipboard.writeText(t).then(() => toast.success('Copied')).catch(() => toast.error('Copy failed')); }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Weekly newsletter</h1></div>
      <p className="text-navy-700/60">Auto-generated from this week&apos;s data. Copy the WhatsApp version to broadcast in groups.</p>

      {gen.isLoading ? <div className="mt-6 flex justify-center"><Loader2 className="animate-spin text-teal-500" /></div> : gen.data && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-sm font-bold text-navy-900">WhatsApp broadcast</h2><Button size="sm" onClick={() => copy(gen.data!.waText)}><Copy className="h-4 w-4" /> Copy</Button></div>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-navy-50 p-3 text-sm text-navy-800">{gen.data.waText}</pre>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h2 className="font-display text-sm font-bold text-navy-900">Preview</h2>
            <h3 className="mt-3 text-xs font-bold uppercase text-navy-700/50">Top jobs</h3>
            <ul className="mt-1 space-y-0.5 text-sm text-navy-700/80">{gen.data.topJobs.map((j, i) => <li key={i}>{j}</li>)}</ul>
            {gen.data.topQa.length > 0 && <><h3 className="mt-3 text-xs font-bold uppercase text-navy-700/50">Q&amp;A</h3><ul className="mt-1 space-y-0.5 text-sm text-navy-700/80">{gen.data.topQa.map((q) => <li key={q.slug}>{q.question}</li>)}</ul></>}
            {gen.data.story && <><h3 className="mt-3 text-xs font-bold uppercase text-navy-700/50">Success story</h3><p className="mt-1 text-sm text-navy-700/80">{gen.data.story.title}</p></>}
          </div>
        </div>
      )}
    </div>
  );
}
