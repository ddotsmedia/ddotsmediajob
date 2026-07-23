import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { IntentJobsView, type IntentConfig } from '@/components/seo/intent-jobs-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: { absolute: 'Urgent Hiring UAE 2026 — Jobs with Immediate Joining | DdotsMediaJobs' },
  description: 'Urgent job vacancies across UAE. Immediate joining. Apply today to roles hiring now in Dubai, Abu Dhabi, Sharjah and all emirates.',
  alternates: { canonical: `${SITE.url}/jobs/urgent-hiring-uae` },
};

const config: IntentConfig = {
  canonical: '/jobs/urgent-hiring-uae',
  h1: 'Urgent Hiring UAE 2026 — Jobs with Immediate Joining',
  subtitle: 'Employers across the UAE hiring urgently — apply today and start soon.',
  listInput: { isUrgent: true },
  intro: [
    'When a UAE employer marks a role as urgent, they need someone to start quickly — often within days. These roles move fast, so applying early gives you the best chance. Urgent hiring is common across driving, sales, hospitality, construction, healthcare and admin, where a sudden vacancy or new project creates immediate demand.',
    'This page collects every urgently-hiring vacancy currently live on DdotsMediaJobs, refreshed daily. Each listing shows the salary (where disclosed), location, and the fastest way to apply — many let you message the employer directly on WhatsApp.',
    'If you are already in the UAE on a transferable or cancelled visa, urgent roles are ideal because employers value immediate availability. Have your CV, passport and visa documents ready so you can respond the moment you find a match.',
    'Set a job alert to be notified the instant a new urgent role is posted in your field, and check back daily — urgent vacancies are filled quickly.',
  ],
  faq: [
    { q: 'What does urgent hiring mean in the UAE?', a: 'It means the employer wants to fill the role immediately — usually within a few days — so they prioritise candidates who can join quickly and respond fast.' },
    { q: 'How quickly can I start an urgent job in the UAE?', a: 'If you are already in the UAE on a transferable or cancelled visa, you may start within days. Candidates needing a new visa take longer due to processing.' },
    { q: 'How do I apply for urgent jobs fast?', a: 'Keep your CV and documents ready, apply as soon as a role is posted, and use the WhatsApp apply option where available to reach the employer directly.' },
    { q: 'Are immediate-joining jobs lower paid?', a: 'Not necessarily. Urgency reflects timing, not pay. Salaries vary by role and experience — always check the disclosed range on each listing.' },
  ],
};

export default function Page() {
  return <IntentJobsView config={config} />;
}
