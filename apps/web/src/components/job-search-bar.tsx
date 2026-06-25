'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { EMIRATES } from '@ddots/shared';
import { Button } from './ui/button';

export function JobSearchBar({ size = 'lg' }: { size?: 'lg' | 'md' }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [emirate, setEmirate] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (emirate) params.set('emirate', emirate);
    router.push(`/jobs?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full flex-col gap-2 rounded-xl border-l-[3px] border-l-teal-500 bg-white p-2 shadow-2xl sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-center gap-2 px-3">
        <Search className="h-5 w-5 shrink-0 text-navy-700/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Job title, keyword or company"
          className="h-11 w-full bg-transparent text-sm text-navy-900 outline-none placeholder:text-navy-700/40"
        />
      </div>
      <div className="flex items-center gap-2 border-navy-100 px-3 sm:border-l">
        <MapPin className="h-5 w-5 shrink-0 text-navy-700/50" />
        <select
          value={emirate}
          onChange={(e) => setEmirate(e.target.value)}
          className="h-11 w-full bg-transparent text-sm text-navy-900 outline-none sm:w-44"
        >
          <option value="">All Emirates</option>
          {EMIRATES.map((em) => (
            <option key={em.slug} value={em.slug}>
              {em.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size={size === 'lg' ? 'lg' : 'default'} className="h-12 w-full sm:h-auto sm:w-auto sm:px-10">
        Search Jobs
      </Button>
    </form>
  );
}
