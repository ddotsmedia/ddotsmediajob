import type { Metadata } from 'next';
import Link from 'next/link';
import { Banknote } from 'lucide-react';
import { EMIRATES } from '@ddots/shared';
import { SALARY_ROLES } from '@/config/salary-roles';
import { SalarySubmitForm } from '@/components/salary-submit-form';

export const metadata: Metadata = {
  title: { absolute: 'UAE Salary Guide 2026 — Real Salaries by Role & Emirate | DdotsMediaJobs' },
  description: 'Crowd-sourced UAE salaries by job role, emirate and experience level. See median, average and salary ranges, or share yours anonymously.',
  alternates: { canonical: '/salaries' },
};

export default function SalariesIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl bg-navy-900 p-6 sm:p-8">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white sm:text-3xl"><Banknote className="h-7 w-7 text-teal-300" /> Salary Guide for the UAE</h1>
        <p className="mt-1 text-sm text-white/70">Real, anonymous salaries by role, emirate and experience level.</p>
      </div>

      <h2 className="mt-8 font-display text-lg font-bold text-navy-900">Browse by role</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SALARY_ROLES.map((r) => (
          <Link key={r.slug} href={`/salaries/${r.slug}`} className="rounded-xl border bg-white p-3 text-sm font-medium text-navy-800 hover:border-teal-400 hover:bg-teal-50">{r.name}</Link>
        ))}
      </div>

      <h2 className="mt-8 font-display text-lg font-bold text-navy-900">Browse by emirate</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {EMIRATES.map((em) => (
          <Link key={em.slug} href={`/salaries/software-engineer/${em.slug}`} className="rounded-full border px-3 py-1.5 text-sm text-navy-700 hover:border-teal-400 hover:bg-teal-50">{em.name}</Link>
        ))}
      </div>

      <div className="mt-10"><SalarySubmitForm /></div>
    </div>
  );
}
