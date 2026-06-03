import type { Metadata } from 'next';
import { SITE } from '@ddots/shared';
import { ToolHero } from '@/components/tools/tool-hero';
import { NafisCalculator } from '@/components/tools/nafis-calculator';

export const metadata: Metadata = {
  title: 'Nafis & Emiratisation Guide + Subsidy Calculator 2026',
  description: 'Understand UAE Emiratisation rules and Nafis subsidies. Calculate your Emirati hiring quota, shortfall and estimated monthly salary support.',
  alternates: { canonical: `${SITE.url}/nafis-guide` },
};

const FACTS = [
  ['Who must comply', 'Mainland private companies with 50+ skilled employees face annual Emiratisation targets (~2%/year).'],
  ['Nafis salary support', 'The Nafis programme tops up Emirati salaries by roughly AED 5,000–7,000 per month, plus child allowances.'],
  ['Minimum salary', 'From January 2026, the minimum salary for supported Emirati roles is AED 6,000/month.'],
  ['Penalties', 'Missing targets incurs monthly fines per unfilled Emirati position — hiring early avoids this.'],
  ['Free zone', 'Most free-zone entities are outside mainland Emiratisation quotas, but Nafis incentives still apply to Emiratis hired.'],
];

export default function Page() {
  return (
    <div className="bg-navy-50/30">
      <ToolHero title="Nafis & Emiratisation Guide" subtitle="Calculate your Emirati hiring quota and Nafis subsidy, and understand the 2026 rules." />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <NafisCalculator />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FACTS.map(([h, b]) => (
            <div key={h} className="rounded-xl border bg-white p-5">
              <h3 className="font-display font-bold text-navy-900">{h}</h3>
              <p className="mt-1 text-sm text-navy-700/70">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
