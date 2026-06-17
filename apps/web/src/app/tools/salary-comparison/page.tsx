import type { Metadata } from 'next';
import { SalaryComparisonClient } from './client';

export const metadata: Metadata = {
  title: 'UAE Salary Comparison Tool — Are You Paid Fairly? | DdotsMediaJobs',
  description: 'Compare your salary against the UAE market by role, emirate and experience. See if you are paid below, at, or above market — and find jobs paying more.',
};

export default async function SalaryComparisonPage({ searchParams }: { searchParams: Promise<{ title?: string; emirate?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-8">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Salary Comparison Tool</h1>
          <p className="mt-1 text-navy-100/70">See how your pay compares to the UAE market — and find roles paying more.</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <SalaryComparisonClient defaultTitle={sp.title ?? ''} defaultEmirate={sp.emirate ?? ''} />
      </div>
    </div>
  );
}
