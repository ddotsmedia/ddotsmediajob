import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { PostAJobForm } from './post-a-job-form';

export const metadata: Metadata = {
  title: { absolute: 'Post a Job in the UAE — Free | DdotsMediaJobs' },
  description:
    'Share a job opportunity on DdotsMediaJobs. Know someone hiring? Post it free — reviewed within 24 hours and seen by thousands of UAE jobseekers.',
  alternates: { canonical: '/post-a-job' },
};

export default function PostAJobPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-navy-900">Share a Job Opportunity</h1>
      <p className="mt-2 text-navy-700/70">Know someone hiring? Post it here. Admin reviews within 24 hours.</p>

      <div className="mt-6">
        <PostAJobForm />
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border bg-white p-4 text-sm text-navy-700/70">
        <Building2 className="h-4 w-4 text-teal-600" />
        Hiring for your own company?
        <Link href="/employer/post" className="font-semibold text-teal-700 hover:underline">Post as an employer →</Link>
      </div>
    </div>
  );
}
