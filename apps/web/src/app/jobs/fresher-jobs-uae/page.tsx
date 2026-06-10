import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { IntentJobsView, type IntentConfig } from '@/components/seo/intent-jobs-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Fresher Jobs in UAE 2026 — No Experience Required | DdotsMediaJobs',
  description: 'Entry level jobs UAE for freshers. No experience required. Driver, sales, admin, hospitality and retail jobs across Dubai, Abu Dhabi and all emirates.',
  alternates: { canonical: `${SITE.url}/jobs/fresher-jobs-uae` },
};

const config: IntentConfig = {
  canonical: '/jobs/fresher-jobs-uae',
  h1: 'Fresher Jobs in UAE 2026 — No Experience Required',
  subtitle: 'Entry-level UAE jobs that welcome freshers — start your career with no prior experience.',
  listInput: { isFresher: true },
  intro: [
    'Starting your career in the UAE is very achievable — many employers actively hire freshers and train them on the job. Entry-level roles are widely available in retail, hospitality, sales, customer service, admin, driving and warehousing, where attitude and willingness to learn matter more than years of experience.',
    'This page lists fresher-friendly vacancies across the UAE currently posted on DdotsMediaJobs, updated daily. Each listing is marked for candidates with little or no experience and shows the salary (where disclosed), location and how to apply.',
    'To stand out as a fresher, keep your CV clear and honest, highlight any internships, part-time work, volunteering or relevant skills, and show enthusiasm for the role. A short, well-written cover note and a professional photo go a long way in the UAE market.',
    'Use our free AI tools to build an ATS-ready CV and practise common interview questions before you apply. Set a job alert so you hear about new fresher roles as soon as they go live.',
  ],
  faq: [
    { q: 'Can I get a job in UAE with no experience?', a: 'Yes. Many UAE employers hire freshers for retail, hospitality, sales, admin, driving and warehouse roles and provide on-the-job training. Focus on attitude, communication and willingness to learn.' },
    { q: 'Which fresher jobs pay best in the UAE?', a: 'Entry-level sales (with commission), IT support and some technical trades can pay more than general roles. Salaries vary, so compare the disclosed ranges on each listing.' },
    { q: 'What should a fresher CV include for UAE jobs?', a: 'Contact details with a photo, a short summary, education, any internships or part-time work, skills, languages, and your nationality and visa status.' },
    { q: 'Do fresher jobs in UAE provide a visa?', a: 'Many do. Look for the "Visa provided" badge on listings, and confirm the full package — visa, insurance and any allowances — before accepting.' },
  ],
};

export default function Page() {
  return <IntentJobsView config={config} />;
}
