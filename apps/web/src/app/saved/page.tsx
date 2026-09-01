import type { Metadata } from 'next';
import { SavedJobsList } from '@/components/saved-jobs-list';

// Personal, client-side list — no SEO value, so keep it out of the index.
export const metadata: Metadata = {
  title: 'Saved Jobs',
  description: 'Jobs you bookmarked on DdotsMediaJobs.',
  robots: { index: false, follow: true },
};

export default function SavedJobsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <h1 className="font-display text-2xl font-bold text-navy-900 md:text-3xl">Saved Jobs</h1>
      <div className="mt-1.5 h-1 w-12 rounded-full bg-teal-500" />
      <p className="mt-2 text-navy-700/60">Bookmarked jobs are saved on this device.</p>
      <div className="mt-8">
        <SavedJobsList />
      </div>
    </section>
  );
}
