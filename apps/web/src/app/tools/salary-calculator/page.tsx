import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { ToolLandingView, type ToolConfig } from '@/components/seo/tool-landing-view';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'UAE Salary Calculator 2026 — Net Take Home Pay | DdotsMediaJobs',
  description: 'Calculate your UAE take home salary. WPS breakdown, gratuity, allowances. Free salary calculator — UAE has 0% income tax.',
  alternates: { canonical: `${SITE.url}/tools/salary-calculator` },
};

const config: ToolConfig = {
  canonical: '/tools/salary-calculator',
  h1: 'UAE Salary Calculator 2026 — Net Take Home Pay',
  subtitle: 'Work out your real UAE take-home pay, allowance split and end-of-service gratuity — free.',
  ctaHref: '/wps-calculator',
  ctaLabel: 'Open the Calculator',
  intro: [
    'One of the biggest advantages of working in the UAE is that there is no personal income tax — your gross salary is effectively your take-home pay. But your contract usually splits that figure into basic salary plus housing, transport and other allowances, and this split matters because end-of-service gratuity is calculated on the basic salary only.',
    'Our free UAE salary calculator breaks your monthly package into basic and allowances using typical UAE ratios, shows your effective take-home pay, and estimates your end-of-service gratuity based on UAE Labour Law (21 days’ basic pay per year for the first five years, 30 days per year thereafter).',
    'Use it to understand a job offer properly, compare packages where one has a higher basic and another more allowances, and plan your savings. Because the UAE levies no income tax, your net pay is your gross — but the basic/allowance split still affects your gratuity and any loan eligibility.',
  ],
  how: [
    'Open the free WPS & salary calculator.',
    'Enter your gross monthly salary.',
    'See the basic / housing / transport allowance breakdown.',
    'Enter your join date and last salary to estimate gratuity.',
    'Compare offers and plan your savings.',
  ],
  faq: [
    { q: 'Is salary taxed in the UAE?', a: 'No. The UAE levies no personal income tax on salaries, so your gross monthly pay is effectively your take-home amount.' },
    { q: 'How is UAE gratuity calculated?', a: 'On your basic salary: 21 days’ pay per year for the first five years of service and 30 days’ pay per year thereafter, capped at two years’ total pay.' },
    { q: 'Why does the basic/allowance split matter?', a: 'Gratuity and some loan calculations are based on the basic salary only, so two offers with the same total can give different gratuity depending on how much is "basic".' },
    { q: 'Is the salary calculator free?', a: 'Yes — the UAE salary and gratuity calculator is completely free to use.' },
  ],
};

export default function Page() {
  return <ToolLandingView config={config} />;
}
