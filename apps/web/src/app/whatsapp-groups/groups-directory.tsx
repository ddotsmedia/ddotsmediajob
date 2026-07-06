'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Users, Search, Briefcase, Award, Zap, Star, Loader2 } from 'lucide-react';
import { CATEGORIES, categoryBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

/** Auto-generated group blurb by category when the group has no description of its own. */
const CATEGORY_DESC: Record<string, string> = {
  general: 'UAE-wide job postings across all industries and categories',
  location: 'Location-specific job opportunities in this emirate',
  medical: 'Healthcare and medical profession job vacancies in UAE',
  it: 'IT, software and technology job opportunities in UAE',
  engineering: 'Engineering and technical job vacancies across UAE',
  accounts: 'Accounting, finance and audit job opportunities in UAE',
  hr: 'HR, administration and operations job vacancies in UAE',
  sales: 'Sales, marketing and business development jobs in UAE',
  teaching: 'Teaching, training and education job opportunities',
  logistics: 'Driving, logistics and transport job vacancies in UAE',
  specialized: 'Specialized trade and industry job opportunities in UAE',
  community: 'Community job groups for specific nationalities and regions',
};

export function GroupsDirectory() {
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const stats = trpc.communityHub.directoryStats.useQuery();
  const groups = trpc.communityHub.getGroups.useQuery({ category: cat || undefined, q: q || undefined });

  return (
    <div>
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-300"><MessageCircle className="h-4 w-4" /> {stats.data?.groups ?? 76} groups · {(stats.data?.members ?? 120000).toLocaleString('en-AE')}+ members</span>
          <h1 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">UAE Job WhatsApp Groups</h1>
          <p className="mx-auto mt-2 max-w-2xl text-navy-100/70">Join free professional groups to get daily job postings on your phone.</p>
          <div className="mx-auto mt-5 flex max-w-md items-center gap-2 rounded-xl bg-white p-2">
            <Search className="ml-1 h-4 w-4 text-navy-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by group or profession" className="w-full bg-transparent px-1 text-sm outline-none" />
          </div>
        </div>
      </div>

      {/* Info + how-to-join */}
      <div className="mx-auto max-w-7xl px-4 pt-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-teal-100 bg-[#f0fafa] p-5">
            <h2 className="font-display text-lg font-bold text-navy-900">About Our WhatsApp Job Groups</h2>
            <p className="mt-2 text-sm text-navy-700/80">DdotsMediaJobs manages 55+ profession-specific WhatsApp groups across UAE. Each group is dedicated to a specific industry or location — ensuring job posts reach the right candidates instantly. All groups are moderated and job-posts only.</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-teal-700">
              <span>55+ Groups</span><span className="text-teal-300">·</span><span>120,000+ Members</span><span className="text-teal-300">·</span><span>7 Emirates</span><span className="text-teal-300">·</span><span>Free to Join</span>
            </div>
          </div>
          <div className="rounded-xl border border-orange-100 bg-[#fff7ed] p-5">
            <h2 className="font-display text-lg font-bold text-navy-900">How to Join</h2>
            <ol className="mt-2 space-y-1 text-sm text-navy-700/80">
              <li>1. Click &quot;Join&quot; on any group below</li>
              <li>2. WhatsApp will open automatically</li>
              <li>3. Tap &quot;Join Group&quot; in WhatsApp</li>
              <li>4. Start receiving job alerts instantly</li>
            </ol>
            <p className="mt-3 text-xs font-medium text-orange-700">💡 Join multiple groups relevant to your profession for maximum opportunities</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCat('')} className={cn('rounded-full px-3 py-1.5 text-sm font-medium', !cat ? 'bg-teal-600 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200')}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.slug} onClick={() => setCat(c.slug)} className={cn('rounded-full px-3 py-1.5 text-sm font-medium', cat === c.slug ? 'bg-teal-600 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200')}>{c.name}</button>
          ))}
        </div>

        {groups.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-teal-500" /></div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.data?.map((g) => {
              const category = g.categorySlug ? categoryBySlug(g.categorySlug) : null;
              const active = g.weeklyActivity > 5;
              return (
                <div key={g.id} className="flex flex-col overflow-hidden rounded-xl border bg-white">
                  <div className="flex h-20 items-center justify-center bg-gradient-to-r from-teal-600 to-navy-900 text-white">
                    {g.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : <MessageCircle className="h-8 w-8 opacity-80" />}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/whatsapp-groups/${g.slug}`} className="font-display font-bold text-navy-900 hover:text-teal-600">{g.name}</Link>
                      {category && <Badge variant="muted">{category.name}</Badge>}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-navy-700/60"><Users className="h-3.5 w-3.5" /> {g.memberCount.toLocaleString('en-AE')} members {active && <span className="ml-1 inline-flex items-center gap-1 text-green-600"><span className="h-2 w-2 rounded-full bg-green-500" /> Active</span>}</p>
                    <p className="mt-1 text-xs text-navy-700/50">{g.jobsSharedCount} jobs shared · {g.hiresCount} hires</p>
                    {(g.description || (g.categorySlug && CATEGORY_DESC[g.categorySlug])) && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-navy-700/70">{g.description || CATEGORY_DESC[g.categorySlug ?? ''] || ''}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {g.badgeMostActive && <Badge variant="gold"><Zap className="mr-1 h-3 w-3" /> Most Active</Badge>}
                      {g.badgeFastestHiring && <Badge variant="success"><Award className="mr-1 h-3 w-3" /> Fastest Hiring</Badge>}
                      {g.badgeFeatured && <Badge><Star className="mr-1 h-3 w-3" /> Featured</Badge>}
                    </div>
                    <div className="mt-auto flex gap-2 pt-3">
                      <a href={g.inviteUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg bg-[#25D366] px-3 py-2 text-center text-sm font-semibold text-white hover:opacity-90">Join</a>
                      {g.categorySlug && <Link href={`/jobs?category=${g.categorySlug}`} className="rounded-lg border px-3 py-2 text-center text-sm font-semibold text-navy-700 hover:bg-navy-50"><Briefcase className="h-4 w-4" /></Link>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {groups.data?.length === 0 && <p className="py-12 text-center text-navy-700/60">No groups match your search.</p>}
      </div>
    </div>
  );
}
