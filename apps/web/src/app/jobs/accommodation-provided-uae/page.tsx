import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { IntentJobsView, type IntentConfig } from '@/components/seo/intent-jobs-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Jobs with Free Accommodation in UAE 2026 | DdotsMediaJobs',
  description: 'UAE jobs that provide free accommodation. Save on rent — driving, construction, hospitality, security and labour roles with housing included.',
  alternates: { canonical: `${SITE.url}/jobs/accommodation-provided-uae` },
};

const config: IntentConfig = {
  canonical: '/jobs/accommodation-provided-uae',
  h1: 'Jobs with Free Accommodation in UAE 2026',
  subtitle: 'UAE roles that include free housing — keep more of your salary.',
  listInput: { q: 'accommodation' },
  intro: [
    'Housing is one of the biggest costs of living in the UAE, so jobs that provide free accommodation can significantly boost your real take-home pay. Employer-provided housing is common in driving, construction, hospitality, security, healthcare and labour roles, and may include shared rooms, staff camps or furnished units depending on the position.',
    'This page lists UAE vacancies that mention accommodation currently posted on DdotsMediaJobs, updated daily. Each listing shows the salary (where disclosed), location and how to apply, so you can compare the full value of the package, not just the basic salary.',
    'When a role includes accommodation, also check whether transport, meals, medical insurance and a visa are provided — together these can be worth a substantial amount each month. Confirm the type of accommodation (shared or private) before accepting.',
    'Set a job alert for accommodation-provided roles in your field and check back regularly, as new listings are added throughout the week.',
  ],
  faq: [
    { q: 'Which UAE jobs provide free accommodation?', a: 'Driving, construction, hospitality, security, healthcare and labour roles often include employer-provided housing, ranging from shared camps to furnished units.' },
    { q: 'Is provided accommodation shared or private?', a: 'It varies. Many roles offer shared rooms or staff accommodation, while senior positions may include private units. Confirm the type on each listing before accepting.' },
    { q: 'Does free accommodation count as part of my salary?', a: 'It is a benefit rather than cash salary, but it greatly increases your real take-home pay by removing rent — your biggest UAE expense.' },
    { q: 'Should I accept a lower salary if accommodation is included?', a: 'Calculate the total value: free housing, transport, meals and insurance can outweigh a higher basic salary without those benefits. Compare full packages.' },
  ],
};

export default function Page() {
  return <IntentJobsView config={config} />;
}
