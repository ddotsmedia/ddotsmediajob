import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { IntentJobsView, type IntentConfig } from '@/components/seo/intent-jobs-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: { absolute: 'Walk In Interview Dubai 2026 — Latest Walk-in Jobs | DdotsMediaJobs' },
  description: "Find today's walk-in interviews in Dubai. No appointment needed. Latest urgent vacancies hiring on the spot across Dubai.",
  alternates: { canonical: `${SITE.url}/jobs/walk-in-interview-dubai` },
};

const config: IntentConfig = {
  canonical: '/jobs/walk-in-interview-dubai',
  h1: 'Walk In Interview Dubai 2026 — Latest Walk-in Jobs',
  subtitle: 'Walk-in interviews happening in Dubai right now — meet employers directly, no appointment needed.',
  listInput: { q: 'walk in', emirate: 'dubai' },
  intro: [
    'Walk-in interviews are one of the fastest ways to get hired in Dubai. Instead of waiting for a callback, you visit the employer at a set time and place, meet the hiring team face to face, and often get a decision on the same day. They are especially common in hospitality, retail, sales, driving, security and construction, where employers need to fill roles quickly.',
    'This page lists the latest walk-in interview jobs in Dubai posted on DdotsMediaJobs, updated daily. Each listing shows the role, salary (where disclosed), location and how to attend — many include a WhatsApp number so you can confirm the date and venue before you go.',
    'To prepare for a Dubai walk-in interview, bring several printed copies of your CV, your passport and visa copy, passport photos, and any relevant certificates or licences. Dress professionally, arrive early, and be ready for a short on-the-spot interview. If you are on a visit or cancelled visa, mention your immediate availability — it is a strong advantage for walk-in roles.',
    'New walk-in vacancies are added throughout the week. Bookmark this page, set a job alert, and check back daily so you never miss an open hiring day in Dubai.',
  ],
  faq: [
    { q: 'What is a walk-in interview?', a: 'A walk-in interview is an open hiring session where candidates attend at a stated time and venue without a prior appointment. You meet the employer directly and are often interviewed and shortlisted on the same day.' },
    { q: 'How do I prepare for a walk-in interview in the UAE?', a: 'Bring multiple printed CV copies, passport and visa copies, photos and certificates. Dress professionally, arrive early, research the company, and be ready for a brief interview on the spot.' },
    { q: 'Do walk-in interviews in Dubai require experience?', a: 'Many walk-in roles in hospitality, retail, driving and security welcome freshers or candidates with limited experience. Check each listing for the specific requirements.' },
    { q: 'Are walk-in jobs in Dubai genuine?', a: 'Walk-in jobs on DdotsMediaJobs are reviewed before publishing. Never pay any fee to attend an interview or secure a job — legitimate UAE employers do not charge candidates.' },
  ],
};

export default function Page() {
  return <IntentJobsView config={config} />;
}
