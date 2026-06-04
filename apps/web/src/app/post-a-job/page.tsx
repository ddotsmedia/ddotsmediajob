import type { Metadata } from 'next';
import Link from 'next/link';
import { Megaphone, Building2, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Post a Job in the UAE — Free | DdotsMediaJobs',
  description:
    'Post a job on DdotsMediaJobs. Employers post directly to thousands of UAE jobseekers; anyone can refer a vacancy they know of as a free community post.',
  alternates: { canonical: '/post-a-job' },
};

export default function PostAJobPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-navy-900">Post a Job</h1>
      <p className="mt-2 text-navy-700/70">Choose how you want to share a vacancy with UAE jobseekers.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border bg-white p-7 shadow-sm">
          <Building2 className="h-8 w-8 text-teal-600" />
          <h2 className="mt-4 font-display text-xl font-bold text-navy-900">I'm an employer</h2>
          <p className="mt-1 text-sm text-navy-700/70">Hiring for your company. Reach candidates directly and manage applicants.</p>
          <ul className="mt-4 space-y-2 text-sm text-navy-700">
            {['Direct Employer listing', 'Applicant tracking + AI scoring', 'AI job-description generator', 'Company profile & verification'].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-teal-600" /> {f}</li>
            ))}
          </ul>
          <Link href="/employer/post" className="mt-6 inline-flex items-center justify-center rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700">
            Post a job as employer
          </Link>
        </div>

        <div className="flex flex-col rounded-2xl border bg-white p-7 shadow-sm">
          <Megaphone className="h-8 w-8 text-amber-500" />
          <h2 className="mt-4 font-display text-xl font-bold text-navy-900">Refer a job (community)</h2>
          <p className="mt-1 text-sm text-navy-700/70">Know a vacancy? Share it with the community. Free, optionally anonymous.</p>
          <ul className="mt-4 space-y-2 text-sm text-navy-700">
            {['Free — 2 posts per month', 'Post anonymously if you prefer', 'Reviewed by admin before going live', 'Runs for 15 days'].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-teal-600" /> {f}</li>
            ))}
          </ul>
          <Link href="/dashboard/refer" className="mt-6 inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 font-semibold text-amber-700 hover:bg-amber-100">
            Refer a job
          </Link>
        </div>
      </div>
    </div>
  );
}
