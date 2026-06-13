'use client';

import { useState } from 'react';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

export default function CvParserPage() {
  const [url, setUrl] = useState('');
  const parse = trpc.employerAts.parseArabicCV.useMutation({ onError: (e) => toast.error(e.message) });
  const data = parse.data as Record<string, unknown> | undefined;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Arabic / bilingual CV parser</h1></div>
      <p className="text-navy-700/60">Paste a CV file URL (PDF or photo). Arabic and bilingual CVs are extracted with Claude (Sonnet).</p>

      <div className="mt-5 flex flex-col gap-2 rounded-xl border bg-white p-4 sm:flex-row">
        <div className="flex-1 space-y-1.5"><Label>CV file URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://files.ddotsmediajobs.com/cv/..." /></div>
        <Button className="self-end" onClick={() => parse.mutate({ fileUrl: url })} disabled={parse.isPending || !url}>
          {parse.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Parse
        </Button>
      </div>

      {data && (
        <div className="mt-5 rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-navy-900">{String(data.name ?? 'Candidate')}</h2>
            {!!data.nameRomanized && <span className="text-navy-700/60">({String(data.nameRomanized)})</span>}
            {typeof data.confidence === 'number' && <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${data.confidence >= 70 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>Parsed {data.confidence}% confidence</span>}
          </div>
          <p className="mt-1 text-sm text-navy-700/70">{[data.nationality, data.location, data.language].filter(Boolean).join(' · ')}</p>
          <p className="mt-1 text-sm text-navy-700/70">{[data.email, data.phone].filter(Boolean).join(' · ')}</p>
          {Array.isArray(data.skills) && data.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">{(data.skills as string[]).map((s) => <span key={s} className="rounded-full bg-navy-50 px-2 py-0.5 text-xs text-navy-700">{s}</span>)}</div>
          )}
          {Array.isArray(data.experience) && (
            <div className="mt-4"><p className="font-semibold text-navy-900">Experience</p>{(data.experience as { company?: string; role?: string; dates?: string; description?: string }[]).map((e, i) => (
              <div key={i} className="mt-2 border-l-2 border-teal-200 pl-3 text-sm"><p className="font-medium text-navy-900">{e.role} {e.company ? `· ${e.company}` : ''}</p><p className="text-navy-700/60">{e.dates}</p>{e.description && <p className="text-navy-700/70">{e.description}</p>}</div>
            ))}</div>
          )}
          {Array.isArray(data.education) && (
            <div className="mt-4"><p className="font-semibold text-navy-900">Education</p>{(data.education as { institution?: string; degree?: string; year?: string }[]).map((e, i) => (
              <p key={i} className="mt-1 text-sm text-navy-700/70">{e.degree} — {e.institution} {e.year ? `(${e.year})` : ''}</p>
            ))}</div>
          )}
        </div>
      )}
    </div>
  );
}
