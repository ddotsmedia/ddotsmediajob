import type { Metadata } from 'next';
import { PostJobForm } from './post-job-form';

export const metadata: Metadata = { title: 'Post a Job', robots: { index: false } };

export default function PostJobPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy-900">Post a Job</h1>
      <p className="text-navy-700/60">Describe the role in plain English and let AI draft it — then review and publish.</p>
      <PostJobForm />
    </div>
  );
}
