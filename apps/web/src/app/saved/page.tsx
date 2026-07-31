import type { Metadata } from 'next';
import { SavedJobsList } from '@/components/saved-jobs-list';

export const metadata: Metadata = {
  title: 'Saved Jobs — DdotsMediaJobs',
  description: 'View and manage your saved jobs',
  robots: { index: false, follow: false },
};

export default function SavedJobsPage() {
  return (
    <div className="min-h-screen bg-white py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="font-display text-4xl font-bold text-[#0F172A] mb-8">Saved Jobs</h1>
        <SavedJobsList />
      </div>
    </div>
  );
}
