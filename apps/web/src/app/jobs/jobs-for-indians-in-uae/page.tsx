import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@ddots/shared';
import { IntentJobsView, type IntentConfig } from '@/components/seo/intent-jobs-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Jobs for Indians in UAE 2026 — Latest Indian Expat Vacancies | DdotsMediaJobs',
  description: 'Jobs in UAE for Indian nationals. Visa provided, accommodation. Top companies hiring Indians across Dubai, Abu Dhabi and all emirates.',
  alternates: { canonical: `${SITE.url}/jobs/jobs-for-indians-in-uae` },
};

const Extra = (
  <div className="mb-8 grid gap-4 sm:grid-cols-3">
    <div className="rounded-xl border bg-white p-4"><h3 className="font-display text-sm font-bold text-navy-900">Visa for Indian nationals</h3><p className="mt-1 text-sm text-navy-700/70">Your UAE employer sponsors the work permit and residence visa. You complete a medical, Emirates ID and visa stamping after arrival — the company bears the cost.</p></div>
    <div className="rounded-xl border bg-white p-4"><h3 className="font-display text-sm font-bold text-navy-900">Popular roles for Indians</h3><p className="mt-1 text-sm text-navy-700/70">IT and software, accounting and finance, engineering, healthcare, sales, driving, retail and hospitality are among the most common roles for Indian professionals in the UAE.</p></div>
    <div className="rounded-xl border bg-white p-4"><h3 className="font-display text-sm font-bold text-navy-900">Community &amp; alerts</h3><p className="mt-1 text-sm text-navy-700/70">Join UAE job <Link href="/whatsapp-groups" className="text-teal-600 hover:underline">WhatsApp groups</Link> and set a free job alert to hear about new openings first.</p></div>
  </div>
);

const config: IntentConfig = {
  canonical: '/jobs/jobs-for-indians-in-uae',
  h1: 'Jobs for Indians in UAE 2026 — Latest Indian Expat Vacancies',
  subtitle: 'UAE roles hiring Indian nationals — visa-provided positions across every industry.',
  listInput: {},
  extra: Extra,
  intro: [
    'Indians form one of the largest expatriate communities in the UAE, working across virtually every industry — from IT, finance and engineering to healthcare, sales, driving, retail and hospitality. UAE employers actively recruit Indian professionals and skilled workers, and the cultural familiarity, direct flights and strong community make the move straightforward.',
    'This page lists live UAE vacancies suitable for Indian candidates on DdotsMediaJobs, updated daily. Many roles include employer-sponsored visas, and a large share add accommodation, transport and medical insurance — significantly increasing your real take-home pay.',
    'For Indian nationals, the employer handles the work permit and residence visa. After arrival you complete a medical fitness test, biometrics for the Emirates ID, and visa stamping. UAE salaries are tax-free, so the monthly figure you agree is effectively your take-home amount.',
    'Build an ATS-ready CV with our free AI tools, set a job alert for your field, and apply directly or via WhatsApp. New roles are added throughout the week.',
  ],
  faq: [
    { q: 'How can an Indian get a job in the UAE?', a: 'Apply to UAE roles matching your skills on trusted portals. Once selected, the employer sponsors your work permit and residence visa. Keep your CV, passport and certificates ready.' },
    { q: 'Do UAE jobs for Indians provide a visa?', a: 'Many do. The employer bears the cost of the work permit and residence visa. Look for the "Visa provided" badge and confirm the full package before accepting.' },
    { q: 'What is the average salary for Indians in the UAE?', a: 'It varies widely by role and experience — from a few thousand AED for entry-level roles to much higher for skilled professionals. Salaries are tax-free; check the disclosed range on each listing.' },
    { q: 'Which UAE cities hire the most Indian workers?', a: 'Dubai and Abu Dhabi have the largest demand, followed by Sharjah. Roles are available across all seven emirates.' },
  ],
};

export default function Page() {
  return <IntentJobsView config={config} />;
}
