import type { Metadata } from 'next';
import { Scale } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { LabourForm } from './labour-form';

export const metadata: Metadata = {
  title: 'UAE Labour Rights & Complaint Guide — Free | DdotsMediaJobs',
  description: 'Know your rights as a worker in the UAE. Get a free step-by-step action plan for unpaid salary, wrongful termination, gratuity, visa bans and more — with MOHRE contacts.',
  alternates: { canonical: `${SITE.url}/resources/labour-rights` },
};

export default function LabourRightsPage() {
  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-2 text-teal-300"><Scale className="h-5 w-5" /><span className="text-sm font-medium">Labour Rights</span></div>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">UAE Labour Rights &amp; Complaint Guide</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">Pick your issue and get a clear, step-by-step action plan — who to contact, what documents you need, and the timelines that apply.</p>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <LabourForm />
        <article className="mt-10 max-w-2xl space-y-3 text-sm leading-relaxed text-navy-700/80">
          <h2 className="font-display text-lg font-bold text-navy-900">Your rights under UAE labour law</h2>
          <p>UAE labour law protects private-sector employees on pay, working hours, leave, end-of-service gratuity and fair treatment. Most disputes start with the Ministry of Human Resources and Emiratisation (MOHRE), which mediates before any referral to the labour court. The MOHRE hotline is 800 60.</p>
          <p>Keep copies of your contract, Emirates ID, salary records (WPS) and any written communication. The planner above gives general guidance tailored to your issue — it is not a substitute for formal legal advice.</p>
        </article>
      </div>
    </div>
  );
}
