import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { IntentJobsView, type IntentConfig } from '@/components/seo/intent-jobs-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Gulf Jobs 2026 — UAE, Saudi, Qatar, Kuwait Opportunities | DdotsMediaJobs',
  description: 'Gulf job opportunities. UAE jobs with visa and accommodation, plus guidance on working across the GCC. Apply free.',
  alternates: { canonical: `${SITE.url}/jobs/gulf-jobs` },
};

const config: IntentConfig = {
  canonical: '/jobs/gulf-jobs',
  h1: 'Gulf Jobs 2026 — UAE, Saudi, Qatar, Kuwait Opportunities',
  subtitle: 'Start your Gulf career in the UAE — visa-provided roles with strong onward GCC prospects.',
  listInput: {},
  intro: [
    'The Gulf Cooperation Council (GCC) — the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain and Oman — is one of the world’s most popular destinations for expatriate workers, offering tax-free salaries, modern infrastructure and a multicultural environment. The UAE, and Dubai in particular, is the most common entry point and the largest hiring market in the region.',
    'This page shows live UAE vacancies across every category on DdotsMediaJobs, updated daily. Building a track record in the UAE is the strongest foundation for a wider Gulf career — UAE experience is highly valued by employers across the GCC.',
    'Most Gulf roles for international candidates include employer-sponsored visas, and many add accommodation, transport and medical insurance. Salaries are quoted in local currency (AED in the UAE) and carry no personal income tax, so your monthly figure is effectively take-home pay.',
    'Start by applying to UAE roles that match your skills, build your experience and network, and set a job alert so you hear about new openings first.',
  ],
  faq: [
    { q: 'What are Gulf jobs?', a: 'Gulf jobs are roles in the GCC countries — the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain and Oman. They typically offer tax-free salaries and employer-sponsored visas for expatriates.' },
    { q: 'Which Gulf country is easiest to find a job in?', a: 'The UAE, especially Dubai, has the largest and most accessible job market in the Gulf, making it the most common starting point for expatriates.' },
    { q: 'Do Gulf jobs provide a visa?', a: 'Most roles for international candidates include an employer-sponsored work visa, and many add accommodation, transport and insurance. Check each listing for the full package.' },
    { q: 'Are Gulf salaries tax-free?', a: 'Yes — GCC countries levy no personal income tax on salaries, so your quoted monthly pay is effectively your take-home amount.' },
  ],
};

export default function Page() {
  return <IntentJobsView config={config} />;
}
