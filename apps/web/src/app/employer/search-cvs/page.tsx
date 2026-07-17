'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search, FileText, MessageCircle, MapPin, Briefcase, GraduationCap, Loader2, X, UserRound } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

type Filters = { skills: string[]; location: string; experience: number };
const NO_FILTERS: Filters = { skills: [], location: '', experience: 0 };

export default function SearchCvsPage() {
  const [draft, setDraft] = useState<Filters>(NO_FILTERS);
  const [skillInput, setSkillInput] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const results = trpc.cvs.search.useQuery({
    skills: filters.skills.length ? filters.skills : undefined,
    location: filters.location || undefined,
    experience: filters.experience || undefined,
    limit: 30,
  });

  const addSkill = () => {
    const s = skillInput.trim().replace(/,$/, '');
    if (s && !draft.skills.includes(s) && draft.skills.length < 10) setDraft((d) => ({ ...d, skills: [...d.skills, s] }));
    setSkillInput('');
  };

  return (
    <div className="max-w-5xl">
      {/* Hero */}
      <div className="rounded-2xl bg-navy-900 p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Search Candidate CVs</h1>
        <p className="mt-1 text-sm text-white/70">AI-parsed CVs from candidates who opted into employer search.</p>
      </div>

      {/* Filters */}
      <div className="mt-4 rounded-2xl border bg-white p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Skills</Label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-navy-200 p-2">
              {draft.skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                  {s}
                  <button onClick={() => setDraft((d) => ({ ...d, skills: d.skills.filter((x) => x !== s) }))} aria-label={`Remove ${s}`}><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(); } }}
                onBlur={addSkill}
                placeholder={draft.skills.length ? '' : 'e.g. Photoshop, Excel'}
                className="min-w-[100px] flex-1 bg-transparent px-1 text-sm outline-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} placeholder="e.g. Dubai" />
          </div>
          <div className="space-y-1.5">
            <Label>Min experience: <span className="font-bold text-teal-700">{draft.experience} yrs</span></Label>
            <input
              type="range" min={0} max={30} value={draft.experience}
              onChange={(e) => setDraft((d) => ({ ...d, experience: Number(e.target.value) }))}
              className="w-full accent-teal-600" aria-label="Minimum years of experience"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setFilters(draft)} disabled={results.isFetching}>
            {results.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
          </Button>
          <Button variant="ghost" onClick={() => { setDraft(NO_FILTERS); setFilters(NO_FILTERS); setSkillInput(''); }}>Clear</Button>
        </div>
      </div>

      {/* Results */}
      {results.isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
      ) : !results.data?.length ? (
        <div className="mt-6 rounded-2xl border border-dashed bg-white p-10 text-center">
          <UserRound className="mx-auto h-10 w-10 text-navy-300" />
          <p className="mt-3 font-semibold text-navy-900">No candidates yet.</p>
          <p className="text-sm text-navy-700/60">Share your job to find matches.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.data.map((c) => {
            const meta = c.cvMetadata ?? {};
            return (
              <div key={c.id} className="flex flex-col rounded-2xl border bg-white p-5">
                <div className="flex items-center gap-3">
                  {c.image ? (
                    <Image src={c.image} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 font-display font-bold text-teal-700">
                      {(c.name ?? '?').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-display font-bold text-navy-900">{c.name ?? 'Candidate'}</p>
                    {c.headline && <p className="truncate text-xs text-navy-700/60">{c.headline}</p>}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-navy-700/80">
                  <p className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 shrink-0 text-teal-600" /> {meta.experience ?? 0} yrs experience</p>
                  {!!meta.location?.length && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-teal-600" /> <span className="truncate">{meta.location.slice(0, 3).join(', ')}</span></p>}
                  {!!meta.education?.length && <p className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 shrink-0 text-teal-600" /> <span className="truncate">{meta.education[0]}</span></p>}
                </div>

                {!!meta.skills?.length && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {meta.skills.slice(0, 6).map((s) => (
                      <span key={s} className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-navy-800">{s}</span>
                    ))}
                    {meta.skills.length > 6 && <span className="px-1 text-[11px] text-navy-700/50">+{meta.skills.length - 6}</span>}
                  </div>
                )}

                <div className="mt-4 flex gap-2 border-t pt-4">
                  {c.resumeUrl && (
                    <Button asChild size="sm" className="flex-1">
                      <a href={c.resumeUrl} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /> View CV</a>
                    </Button>
                  )}
                  {c.phone && (
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> Message</a>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
