'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Loader2, FileText, MapPin, Download, MessageCircle, ExternalLink, Clock } from 'lucide-react';
import { CATEGORIES, EMIRATES, VISA_STATUS, emirateBySlug, formatExperience, timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Input, Label, Select, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';

const blank = { q: '', category: '', emirate: '', experienceLevel: '', nationality: '', visaStatus: '', salaryMax: '', skills: '' };

export default function CandidateSearchPage() {
  const [filters, setFilters] = useState(blank);
  const [applied, setApplied] = useState(blank);
  const logView = trpc.jobseekers.logCvView.useMutation();
  const results = trpc.candidates.search.useQuery({
    q: applied.q || undefined,
    category: applied.category || undefined,
    emirate: applied.emirate || undefined,
    nationality: applied.nationality || undefined,
    visaStatus: applied.visaStatus || undefined,
    salaryMax: applied.salaryMax ? Number(applied.salaryMax) : undefined,
    skills: applied.skills ? applied.skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    page: 1,
  });
  const set = (k: keyof typeof blank, v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const log = (userId: string) => logView.mutate({ profileUserId: userId });

  return (
    <div>
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-teal-500" />
        <h1 className="font-display text-2xl font-bold text-navy-900">CV Search</h1>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-navy-700/60">Search jobseekers open to work. All free — contact shown where the candidate opted in.</p>
        <Button variant="outline" size="sm" onClick={() => downloadCsv('candidates.csv', (results.data ?? []).map((c) => ({ name: c.name ?? '', headline: c.headline ?? '', emirate: c.emirateSlug ?? '', skills: (c.skills ?? []).join('; ') })))}>
          <Download /> Export CSV
        </Button>
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
        <div className="space-y-1.5 lg:col-span-2"><Label>Keyword / headline</Label><Input value={filters.q} onChange={(e) => set('q', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Category</Label><Select value={filters.category} onChange={(e) => set('category', e.target.value)}><option value="">Any</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></div>
        <div className="space-y-1.5"><Label>Emirate</Label><Select value={filters.emirate} onChange={(e) => set('emirate', e.target.value)}><option value="">Any</option>{EMIRATES.map((e2) => <option key={e2.slug} value={e2.slug}>{e2.name}</option>)}</Select></div>
        <div className="space-y-1.5"><Label>Nationality</Label><Input value={filters.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="e.g. Indian" /></div>
        <div className="space-y-1.5"><Label>Visa status</Label><Select value={filters.visaStatus} onChange={(e) => set('visaStatus', e.target.value)}><option value="">Any</option>{VISA_STATUS.map((v) => <option key={v} value={v} className="capitalize">{v.replace(/-/g, ' ')}</option>)}</Select></div>
        <div className="space-y-1.5"><Label>Max expected salary (AED)</Label><Input type="number" value={filters.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} /></div>
        <div className="space-y-1.5 lg:col-span-2"><Label>Skills (comma-separated)</Label><Input value={filters.skills} onChange={(e) => set('skills', e.target.value)} placeholder="Excel, IFRS, SAP" /></div>
        <Button onClick={() => setApplied(filters)}>Search</Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {results.isLoading && <Loader2 className="animate-spin text-teal-500" />}
        {results.data?.map((c) => (
          <div key={c.userId} className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-100 font-bold text-navy-700">{(c.name ?? 'U').charAt(0).toUpperCase()}</div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy-900">{c.name ?? 'Candidate'}</p>
                <p className="truncate text-xs text-navy-700/60">{c.headline ?? '—'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.emirateSlug && <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{emirateBySlug(c.emirateSlug)?.name}</Badge>}
              {c.availabilityStatus && <Badge variant={c.availabilityStatus === 'actively_looking' ? 'success' : 'muted'} className="capitalize">{c.availabilityStatus.replace(/_/g, ' ')}</Badge>}
              {c.yearsExperience ? <Badge variant="muted">{c.yearsExperience} yr{c.yearsExperience === 1 ? '' : 's'}</Badge> : c.experienceLevel && <Badge variant="muted">{formatExperience(c.experienceLevel)}</Badge>}
              {c.nationality && <Badge variant="outline">{c.nationality}</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">{(c.skills ?? []).slice(0, 6).map((s) => <Badge key={s} variant="default">{s}</Badge>)}</div>
            {c.lastActive && <p className="mt-2 flex items-center gap-1 text-xs text-navy-700/50"><Clock className="h-3 w-3" /> Active {timeAgo(c.lastActive)}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {c.username && <Button asChild size="sm" variant="outline" onClick={() => log(c.userId)}><Link href={`/talent/${c.username}`} target="_blank"><ExternalLink className="h-3.5 w-3.5" /> Profile</Link></Button>}
              {c.resumeUrl && <a href={c.resumeUrl} target="_blank" rel="noopener noreferrer" onClick={() => log(c.userId)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold text-navy-700 hover:bg-navy-50"><FileText className="h-3.5 w-3.5" /> CV</a>}
              {c.whatsapp && <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={() => log(c.userId)} className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
            </div>
          </div>
        ))}
        {results.data?.length === 0 && <p className="text-navy-700/60">No candidates match these filters.</p>}
      </div>
    </div>
  );
}
