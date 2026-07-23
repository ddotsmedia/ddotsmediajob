import type { Metadata } from 'next';
import { Plane } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { RelocationForm } from './relocation-form';

export const metadata: Metadata = {
  title: { absolute: 'UAE Relocation Advisor — Free AI Planner | DdotsMediaJobs' },
  description: 'Planning to move to the UAE for work? Get a free AI relocation plan: best emirate, visa route, cost of living, net savings and a 30-day action plan.',
  alternates: { canonical: `${SITE.url}/resources/relocation-advisor` },
};

export default function RelocationAdvisorPage() {
  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-2 text-teal-300"><Plane className="h-5 w-5" /><span className="text-sm font-medium">UAE Relocation Advisor</span></div>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">Plan your move to the UAE</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">Tell us where you&apos;re coming from and the role you&apos;re targeting. Get a tailored plan — best emirate, visa route, cost of living and likely savings.</p>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <RelocationForm />
        <article className="mt-10 max-w-2xl space-y-3 text-sm leading-relaxed text-navy-700/80">
          <h2 className="font-display text-lg font-bold text-navy-900">Moving to the UAE for work</h2>
          <p>The UAE attracts professionals from around the world with tax-free salaries, a safe multicultural environment and strong career growth. Before you move, it helps to understand which emirate fits your role and budget, the visa route your employer will use, and your realistic monthly costs for housing, schooling and transport.</p>
          <p>Use the planner above for a personalised estimate, then explore live vacancies and our salary guide to benchmark offers. Remember UAE salaries carry no personal income tax, so your monthly figure is effectively take-home pay.</p>
        </article>
      </div>
    </div>
  );
}
