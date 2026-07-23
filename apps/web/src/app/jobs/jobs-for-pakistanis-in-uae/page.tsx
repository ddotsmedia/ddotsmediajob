import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@ddots/shared';
import { IntentJobsView, type IntentConfig } from '@/components/seo/intent-jobs-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: { absolute: 'Jobs for Pakistanis in UAE 2026 — Pakistan to UAE Vacancies | DdotsMediaJobs' },
  description: 'Jobs in UAE for Pakistani nationals. Visa provided, accommodation. Driving, construction, sales, IT and admin roles across all emirates.',
  alternates: { canonical: `${SITE.url}/jobs/jobs-for-pakistanis-in-uae` },
};

const Extra = (
  <div className="mb-8 grid gap-4 sm:grid-cols-3">
    <div className="rounded-xl border bg-white p-4"><h3 className="font-display text-sm font-bold text-navy-900">Visa for Pakistani nationals</h3><p className="mt-1 text-sm text-navy-700/70">The UAE employer sponsors your work permit and residence visa. After arrival you complete a medical, Emirates ID and visa stamping — the company bears the cost.</p></div>
    <div className="rounded-xl border bg-white p-4"><h3 className="font-display text-sm font-bold text-navy-900">Popular roles</h3><p className="mt-1 text-sm text-navy-700/70">Driving, construction, sales, IT, accounting, security, retail and hospitality are among the most common roles for Pakistani workers in the UAE.</p></div>
    <div className="rounded-xl border bg-white p-4"><h3 className="font-display text-sm font-bold text-navy-900">Community &amp; alerts</h3><p className="mt-1 text-sm text-navy-700/70">Join UAE job <Link href="/whatsapp-groups" className="text-teal-600 hover:underline">WhatsApp groups</Link> and set a free job alert to hear about new openings first.</p></div>
  </div>
);

const config: IntentConfig = {
  canonical: '/jobs/jobs-for-pakistanis-in-uae',
  h1: 'Jobs for Pakistanis in UAE 2026 — Pakistan to UAE Vacancies',
  subtitle: 'UAE roles hiring Pakistani nationals — visa-provided positions across every industry.',
  listInput: {},
  extra: Extra,
  intro: [
    'Pakistanis form one of the largest expatriate communities in the UAE, working across driving, construction, sales, IT, accounting, security, retail and hospitality. UAE employers actively recruit Pakistani professionals and skilled workers, and the established community, direct flights and cultural familiarity make relocating straightforward.',
    'This page lists live UAE vacancies suitable for Pakistani candidates on DdotsMediaJobs, updated daily. Many roles include employer-sponsored visas, and a large share add accommodation, transport and medical insurance — boosting your real take-home pay.',
    'For Pakistani nationals, the employer handles the work permit and residence visa. After arrival you complete a medical fitness test, biometrics for the Emirates ID, and visa stamping. UAE salaries are tax-free, so your agreed monthly figure is effectively your take-home amount.',
    'Build an ATS-ready CV with our free AI tools, set a job alert for your field, and apply directly or via WhatsApp. New roles are added throughout the week.',
  ],
  faq: [
    { q: 'How can a Pakistani get a job in the UAE?', a: 'Apply to UAE roles matching your skills on trusted portals. Once selected, the employer sponsors your work permit and residence visa. Keep your CV, passport and certificates ready.' },
    { q: 'Do UAE jobs for Pakistanis provide a visa?', a: 'Many do. The employer bears the cost of the work permit and residence visa. Look for the "Visa provided" badge and confirm the full package before accepting.' },
    { q: 'What is the average salary for Pakistanis in the UAE?', a: 'It varies widely by role and experience. Salaries are tax-free, so the monthly figure you agree is effectively take-home. Check the disclosed range on each listing.' },
    { q: 'Which UAE cities hire the most Pakistani workers?', a: 'Dubai, Abu Dhabi and Sharjah have the largest demand, with roles available across all seven emirates.' },
  ],
};

export default function Page() {
  return <IntentJobsView config={config} />;
}
