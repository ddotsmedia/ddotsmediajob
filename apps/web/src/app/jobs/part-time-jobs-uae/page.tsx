import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { IntentJobsView, type IntentConfig } from '@/components/seo/intent-jobs-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: { absolute: 'Part Time Jobs in UAE 2026 — Flexible Work | DdotsMediaJobs' },
  description: 'Part-time and flexible jobs in the UAE. Evening, weekend and hourly roles in Dubai, Abu Dhabi and Sharjah. Apply free.',
  alternates: { canonical: `${SITE.url}/jobs/part-time-jobs-uae` },
};

const config: IntentConfig = {
  canonical: '/jobs/part-time-jobs-uae',
  h1: 'Part Time Jobs in UAE 2026 — Flexible Work',
  subtitle: 'Flexible, part-time and hourly roles across the UAE — fit work around your schedule.',
  listInput: { jobType: 'part-time' },
  intro: [
    'Part-time work is growing across the UAE as employers offer more flexible arrangements. Part-time roles suit students, parents, freelancers and anyone wanting to supplement their income — common areas include retail, hospitality, tutoring, events, promotions, delivery and administrative support.',
    'This page lists part-time vacancies currently live on DdotsMediaJobs, refreshed daily. Each listing shows the role, pay (where disclosed), location and how to apply, so you can quickly find work that fits your availability.',
    'Before accepting part-time work in the UAE, check your visa permits it — your sponsor or a part-time work permit from MOHRE may be required. Clarify the hours, hourly or monthly pay, and whether transport is provided.',
    'Set a job alert for part-time roles in your area and check back regularly, as flexible openings are added throughout the week.',
  ],
  faq: [
    { q: 'Are part-time jobs legal in the UAE?', a: 'Yes, with the right authorisation. UAE labour rules allow part-time work under a part-time work permit or with your sponsor’s approval. Confirm your visa status before starting.' },
    { q: 'What part-time jobs are common in the UAE?', a: 'Retail, hospitality, tutoring, events and promotions, delivery, and administrative support frequently offer part-time or flexible hours.' },
    { q: 'How is part-time pay structured in the UAE?', a: 'Part-time roles may be paid hourly, per shift or monthly. Always confirm the rate and whether transport or other allowances are included.' },
    { q: 'Can students work part-time in the UAE?', a: 'Students on certain visas can work part-time with the appropriate permit. Check the specific requirements for your visa type before applying.' },
  ],
};

export default function Page() {
  return <IntentJobsView config={config} />;
}
