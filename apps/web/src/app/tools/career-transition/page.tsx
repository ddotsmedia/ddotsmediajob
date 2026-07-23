import type { Metadata } from 'next';
import { ArrowRightLeft } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { TransitionForm } from './transition-form';

export const metadata: Metadata = {
  title: { absolute: 'Career Transition Planner — UAE | DdotsMediaJobs' },
  description: 'Switching careers in the UAE? Get a free month-by-month transition plan: skills to learn, certifications, portfolio and networking to move into your target role.',
  alternates: { canonical: `${SITE.url}/tools/career-transition` },
};

export default function CareerTransitionPage() {
  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-2 text-teal-300"><ArrowRightLeft className="h-5 w-5" /><span className="text-sm font-medium">Career Transition Planner</span></div>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">Plan your career switch</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">Tell us your current and target roles. Get a practical, UAE-relevant month-by-month plan to make the move.</p>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <TransitionForm />
        <article className="mt-10 max-w-2xl space-y-3 text-sm leading-relaxed text-navy-700/80">
          <h2 className="font-display text-lg font-bold text-navy-900">Changing careers in the UAE</h2>
          <p>The UAE&apos;s fast-growing economy rewards professionals who upskill and pivot into in-demand fields like technology, healthcare and finance. A clear plan — recognised certifications, a portfolio of real work, and targeted networking — shortens the path and strengthens your applications.</p>
          <p>Use the planner above to map your transition, then explore live vacancies and our salary guide to benchmark where your new role can take you.</p>
        </article>
      </div>
    </div>
  );
}
