'use client';

import { use, useMemo, useState } from 'react';
import { Loader2, Copy, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatSalary, emirateBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ddotsmediajobs.com';

export default function ShareJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const job = trpc.jobs.byId.useQuery({ id });
  const [tone, setTone] = useState<'urgent' | 'professional' | 'casual'>('urgent');

  const og = useMemo(() => {
    if (!job.data) return '';
    const j = job.data;
    const p = new URLSearchParams({
      title: j.title, company: '', salary: formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden),
      emirate: emirateBySlug(j.emirateSlug)?.name ?? j.emirateSlug, visa: j.visaProvided ? '1' : '0', urgent: j.isUrgent ? '1' : '0',
    });
    return `${SITE}/api/og/hiring?${p.toString()}`;
  }, [job.data]);

  if (job.isLoading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;
  if (!job.data) return <div className="p-10 text-center text-navy-700/70">Job not found.</div>;
  const j = job.data;
  const link = `${SITE}/jobs/${j.slug}`;
  const salary = formatSalary(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryHidden);
  const emName = emirateBySlug(j.emirateSlug)?.name ?? j.emirateSlug;

  const waText =
    tone === 'urgent'
      ? `🚨 *URGENT HIRING* 🚨\n📋 ${j.title}\n📍 ${emName}\n💰 ${salary}\n${j.visaProvided ? '✅ Visa Provided\n' : ''}📲 Apply: ${link}`
      : tone === 'professional'
        ? `We're hiring: *${j.title}*\n${emName}\nSalary: ${salary}\nApply: ${link}`
        : `Hey! We have an opening 👇\n*${j.title}* in ${emName}\n💰 ${salary}\nApply here: ${link}`;

  function copy(text: string) { navigator.clipboard.writeText(text).then(() => toast.success('Copied')).catch(() => toast.error('Copy failed')); }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2"><Share2 className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Share this job</h1></div>
      <p className="text-navy-700/60">{j.title} · {emName}</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-display text-sm font-bold text-navy-900">WhatsApp blast text</h2>
          <div className="mt-2 flex gap-2">
            {(['urgent', 'professional', 'casual'] as const).map((t) => (
              <button key={t} onClick={() => setTone(t)} className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', tone === t ? 'bg-teal-600 text-white' : 'bg-navy-50 text-navy-700')}>{t}</button>
            ))}
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-navy-50 p-3 text-sm text-navy-800">{waText}</pre>
          <Button className="mt-3" size="sm" onClick={() => copy(waText)}><Copy className="h-4 w-4" /> Copy text</Button>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-display text-sm font-bold text-navy-900">Social cards</h2>
          <div className="mt-3 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={og} alt="Hiring card preview" className="w-full" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={og} download className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"><Download className="h-4 w-4" /> WhatsApp/Story</a>
            <a href={`${og}&format=linkedin`} download className="inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50"><Download className="h-4 w-4" /> LinkedIn</a>
            <Button size="sm" variant="outline" onClick={() => copy(link)}><Copy className="h-4 w-4" /> Copy link</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
