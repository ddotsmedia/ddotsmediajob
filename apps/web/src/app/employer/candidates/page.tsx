'use client';

import { useState } from 'react';
import { Users, Loader2, FileText, MapPin, Download } from 'lucide-react';
import { CATEGORIES, EMIRATES, EXPERIENCE_LEVELS, emirateBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Input, Label, Select, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';

export default function CandidateSearchPage() {
  const [filters, setFilters] = useState({ q: '', category: '', emirate: '', experienceLevel: '' });
  const [applied, setApplied] = useState(filters);
  const results = trpc.candidates.search.useQuery(
    {
      q: applied.q || undefined,
      category: applied.category || undefined,
      emirate: applied.emirate || undefined,
      experienceLevel: applied.experienceLevel || undefined,
      page: 1,
    },
    { enabled: true },
  );

  return (
    <div>
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-teal-500" />
        <h1 className="font-display text-2xl font-bold text-navy-900">Candidate Search</h1>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-navy-700/60">Browse jobseekers who are open to work.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              'candidates.csv',
              (results.data ?? []).map((c) => ({
                name: c.name ?? '',
                headline: c.headline ?? '',
                category: c.categorySlug ?? '',
                emirate: c.emirateSlug ?? '',
                experience: c.experienceLevel ?? '',
                skills: (c.skills ?? []).join('; '),
              })),
            )
          }
        >
          <Download /> Export CSV
        </Button>
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div className="space-y-1.5 lg:col-span-2"><Label>Keyword / skill</Label><Input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Category</Label><Select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">Any</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></div>
        <div className="space-y-1.5"><Label>Emirate</Label><Select value={filters.emirate} onChange={(e) => setFilters({ ...filters, emirate: e.target.value })}><option value="">Any</option>{EMIRATES.map((e2) => <option key={e2.slug} value={e2.slug}>{e2.name}</option>)}</Select></div>
        <Button onClick={() => setApplied(filters)}>Search</Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.isLoading && <Loader2 className="animate-spin text-teal-500" />}
        {results.data?.map((c) => (
          <div key={c.userId} className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-100 font-bold text-navy-700">
                {(c.name ?? 'U').charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy-900">{c.name ?? 'Candidate'}</p>
                <p className="truncate text-xs text-navy-700/60">{c.headline ?? '—'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.emirateSlug && <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{emirateBySlug(c.emirateSlug)?.name}</Badge>}
              {c.experienceLevel && <Badge variant="muted">{c.experienceLevel.replace(/-/g, ' ')}</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(c.skills ?? []).slice(0, 5).map((s) => <Badge key={s} variant="default">{s}</Badge>)}
            </div>
            {c.resumeUrl && (
              <a href={c.resumeUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:underline">
                <FileText className="h-4 w-4" /> View CV
              </a>
            )}
          </div>
        ))}
        {results.data?.length === 0 && <p className="text-navy-700/60">No candidates match these filters.</p>}
      </div>
    </div>
  );
}
