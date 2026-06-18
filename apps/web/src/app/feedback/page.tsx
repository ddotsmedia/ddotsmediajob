import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { FeedbackForm } from './feedback-form';

export const metadata: Metadata = {
  title: 'Send Feedback',
  description: 'Send DdotsMediaJobs your feedback, suggestions, partnership inquiries, or report an issue.',
  alternates: { canonical: `${SITE.url}/feedback` },
};

export default function FeedbackPage() {
  return (
    <div className="bg-navy-50/30">
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h1 className="font-display text-3xl font-extrabold text-white md:text-4xl">We&apos;d love to hear from you</h1>
          <p className="mt-2 text-navy-100/70">Send us your feedback, suggestions or report an issue.</p>
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <FeedbackForm />
      </div>
    </div>
  );
}
