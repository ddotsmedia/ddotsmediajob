import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@ddots/shared';
import { IntentJobsView, type IntentConfig } from '@/components/seo/intent-jobs-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Jobs for Filipinos in Dubai 2026 — OFW Vacancies UAE | DdotsMediaJobs',
  description: 'Jobs in Dubai for Filipino workers. Nurse, caregiver, hospitality and retail jobs. Visa provided. Guidance for OFWs moving to the UAE.',
  alternates: { canonical: `${SITE.url}/jobs/jobs-for-filipinos-in-dubai` },
};

const Extra = (
  <div className="mb-8 grid gap-4 sm:grid-cols-3">
    <div className="rounded-xl border bg-white p-4"><h3 className="font-display text-sm font-bold text-navy-900">OFW deployment</h3><p className="mt-1 text-sm text-navy-700/70">Filipino workers should ensure their deployment is processed correctly and that the employer is reputable. Verify the contract terms and keep copies of all documents.</p></div>
    <div className="rounded-xl border bg-white p-4"><h3 className="font-display text-sm font-bold text-navy-900">Popular roles</h3><p className="mt-1 text-sm text-navy-700/70">Nursing and caregiving, hospitality, retail, customer service, beauty and admin are among the most common roles for Filipinos in Dubai.</p></div>
    <div className="rounded-xl border bg-white p-4"><h3 className="font-display text-sm font-bold text-navy-900">Community &amp; alerts</h3><p className="mt-1 text-sm text-navy-700/70">Join UAE job <Link href="/whatsapp-groups" className="text-teal-600 hover:underline">WhatsApp groups</Link> and set a free job alert to hear about new Dubai openings first.</p></div>
  </div>
);

const config: IntentConfig = {
  canonical: '/jobs/jobs-for-filipinos-in-dubai',
  h1: 'Jobs for Filipinos in Dubai 2026 — OFW Vacancies UAE',
  subtitle: 'Dubai roles hiring Filipino workers — healthcare, hospitality, retail and more.',
  listInput: { emirate: 'dubai' },
  extra: Extra,
  intro: [
    'Filipinos are a vital part of Dubai’s workforce, especially in healthcare, hospitality, retail, customer service, beauty and administration. Employers value the strong English skills, service mindset and professionalism of Filipino candidates, and the large, supportive Filipino community in the UAE makes settling in easier.',
    'This page lists live Dubai vacancies suitable for Filipino candidates on DdotsMediaJobs, updated daily. Many roles include employer-sponsored visas, and a large share add accommodation, transport and medical insurance.',
    'For Overseas Filipino Workers (OFWs), it is important to verify that the employer is legitimate and that your deployment is handled properly. Never pay a fee to secure a job, read your contract carefully, and keep copies of all documents.',
    'Build a professional CV with our free AI tools, set a job alert for your field, and apply directly or via WhatsApp. New Dubai roles are added throughout the week.',
  ],
  faq: [
    { q: 'How can a Filipino get a job in Dubai?', a: 'Apply to Dubai roles matching your skills on trusted portals. Once selected, the employer sponsors your visa. Ensure your deployment is processed properly and never pay a placement fee.' },
    { q: 'What are the best jobs for Filipinos in Dubai?', a: 'Nursing and caregiving, hospitality, retail, customer service, beauty and administration are among the most in-demand roles for Filipino workers.' },
    { q: 'Do Dubai jobs for Filipinos provide accommodation?', a: 'Many do, particularly in healthcare and hospitality. Check each listing and confirm whether accommodation, transport and insurance are included.' },
    { q: 'Is it safe to work in Dubai as an OFW?', a: 'Dubai is widely regarded as safe with legal protections for workers. Use trusted portals, verify the employer, and keep your documents and contract copies secure.' },
  ],
};

export default function Page() {
  return <IntentJobsView config={config} />;
}
