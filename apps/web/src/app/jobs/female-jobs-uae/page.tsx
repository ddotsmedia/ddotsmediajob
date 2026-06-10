import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { IntentJobsView, type IntentConfig } from '@/components/seo/intent-jobs-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Female Jobs in UAE 2026 — Ladies Vacancies | DdotsMediaJobs',
  description: 'Job vacancies for women in UAE. Office, healthcare, education, beauty and retail jobs for ladies in Dubai, Abu Dhabi and all emirates.',
  alternates: { canonical: `${SITE.url}/jobs/female-jobs-uae` },
};

const config: IntentConfig = {
  canonical: '/jobs/female-jobs-uae',
  h1: 'Female Jobs in UAE 2026 — Ladies Vacancies',
  subtitle: 'Roles well-suited to women across the UAE — office, healthcare, education, beauty and retail.',
  listInput: { q: 'female' },
  intro: [
    'The UAE offers a wide range of opportunities for women across many industries. While UAE labour law prohibits discrimination and most roles are open to all, certain positions — such as ladies’ salon and spa staff, female nurses, teachers, receptionists, and roles in women-only environments — specifically seek female candidates.',
    'This page highlights vacancies suited to women currently posted on DdotsMediaJobs, updated daily. Strong areas include healthcare, education, beauty and wellness, hospitality, retail, customer service and administration. Each listing shows the salary (where disclosed), location and how to apply.',
    'Many UAE employers provide visa sponsorship, medical insurance and, for some roles, shared accommodation and transport. Family-friendly working hours are increasingly common in office and education roles.',
    'Build a professional CV with our free AI tools, set a job alert for your field, and apply directly through the platform or WhatsApp. New roles are added throughout the week.',
  ],
  faq: [
    { q: 'What are the best jobs for women in the UAE?', a: 'Popular options include nursing and healthcare, teaching, beauty and wellness, retail, customer service, HR and administration. The right fit depends on your skills and qualifications.' },
    { q: 'Do female jobs in the UAE provide accommodation?', a: 'Some do, particularly in healthcare, hospitality and beauty. Check each listing and confirm whether accommodation, transport and insurance are included.' },
    { q: 'Is it safe for women to work in the UAE?', a: 'The UAE is widely regarded as safe, with legal protections for employees. Always use trusted job portals and never pay a fee to secure a job.' },
    { q: 'Can women get visa-sponsored jobs in the UAE?', a: 'Yes. Many employers sponsor an employment visa for female staff. Look for the "Visa provided" badge and confirm the full package before accepting.' },
  ],
};

export default function Page() {
  return <IntentJobsView config={config} />;
}
