'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, Search } from 'lucide-react';

// UI-ready quick filters. Navigates to /jobs with query params (the jobs page owns
// the actual filtering). Curated inline options keep this self-contained.
const EMIRATES = [
  { slug: '', label: 'All Emirates' },
  { slug: 'dubai', label: 'Dubai' },
  { slug: 'abu-dhabi', label: 'Abu Dhabi' },
  { slug: 'sharjah', label: 'Sharjah' },
  { slug: 'ajman', label: 'Ajman' },
  { slug: 'ras-al-khaimah', label: 'Ras Al Khaimah' },
  { slug: 'fujairah', label: 'Fujairah' },
  { slug: 'umm-al-quwain', label: 'Umm Al Quwain' },
];
const CATEGORIES = [
  { slug: '', label: 'All Categories' },
  { slug: 'driver', label: 'Driver' },
  { slug: 'sales-marketing', label: 'Sales & Marketing' },
  { slug: 'healthcare', label: 'Healthcare' },
  { slug: 'accounting-finance', label: 'Accounting & Finance' },
  { slug: 'engineering', label: 'Engineering' },
  { slug: 'hospitality', label: 'Hospitality' },
  { slug: 'construction', label: 'Construction' },
  { slug: 'it-software', label: 'IT & Software' },
];
const SALARY = [
  { v: '', label: 'Any Salary' },
  { v: '2000', label: 'AED 2,000+' },
  { v: '4000', label: 'AED 4,000+' },
  { v: '6000', label: 'AED 6,000+' },
  { v: '10000', label: 'AED 10,000+' },
];

const selectCls =
  'w-full rounded-lg border border-[#E5EEF0] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2E8E97] focus:ring-2 focus:ring-[#2E8E97]/20';

export function HomeFilterBar() {
  const router = useRouter();
  const [emirate, setEmirate] = useState('');
  const [category, setCategory] = useState('');
  const [salaryMin, setSalaryMin] = useState('');

  function apply() {
    const p = new URLSearchParams();
    if (emirate) p.set('emirate', emirate);
    if (category) p.set('category', category);
    if (salaryMin) p.set('salaryMin', salaryMin);
    const qs = p.toString();
    router.push(qs ? `/jobs?${qs}` : '/jobs');
  }

  return (
    <div className="rounded-2xl border border-[#E5EEF0] bg-white/80 p-3 shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-[#64748B]">
        <SlidersHorizontal className="h-3.5 w-3.5 text-[#2E8E97]" /> Filter jobs
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sr-only" htmlFor="f-emirate">Emirate</label>
        <select id="f-emirate" className={selectCls} value={emirate} onChange={(e) => setEmirate(e.target.value)}>
          {EMIRATES.map((o) => <option key={o.label} value={o.slug}>{o.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-category">Category</label>
        <select id="f-category" className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((o) => <option key={o.label} value={o.slug}>{o.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-salary">Minimum salary</label>
        <select id="f-salary" className={selectCls} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)}>
          {SALARY.map((o) => <option key={o.label} value={o.v}>{o.label}</option>)}
        </select>
        <button
          type="button"
          onClick={apply}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F9733A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e8622a] active:scale-[0.98]"
        >
          <Search className="h-4 w-4" /> Show Jobs
        </button>
      </div>
    </div>
  );
}
