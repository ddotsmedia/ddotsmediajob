import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@ddots/shared';
import { ToolHero } from '@/components/tools/tool-hero';

export const metadata: Metadata = {
  title: 'UAE Visa Types Guide 2026 — Employment, Golden, Blue & More',
  description: 'A clear 2026 guide to UAE work visas: standard employment visa, free-zone visa, Golden Visa, Blue Visa, Job Exploration Visa and family sponsorship.',
  alternates: { canonical: `${SITE.url}/visa-guide` },
};

const VISAS = [
  { name: 'Standard Employment Visa', body: 'Sponsored by a mainland employer, valid 2 years, tied to a MOHRE contract. Most common route for expatriate workers.' },
  { name: 'Free Zone Employment Visa', body: 'Issued by the free-zone authority (DMCC, DIFC, ADGM, JAFZA, etc.). Tied to a free-zone company; quick processing.' },
  { name: 'Golden Visa (10-year)', body: 'For high earners (AED 30,000+/month with a degree), investors, entrepreneurs, and exceptional talent. Self-sponsored, renewable.' },
  { name: 'Blue Visa', body: 'New 2025/26 long-term visa for skilled tradespeople and specialists who contribute to the UAE economy.' },
  { name: 'Job Exploration Visa', body: 'Short-term visa (expanded 2025/26) letting skilled jobseekers enter the UAE to search for work without an employer sponsor.' },
  { name: 'Family Sponsorship', body: 'Residents earning above the threshold (typically AED 4,000+, or 3,000 with accommodation) can sponsor spouse and children.' },
];

const FAQ = [
  ['What salary do I need for a UAE Golden Visa?', 'Generally AED 30,000+ per month plus a bachelor degree, or qualification as an investor, entrepreneur or specialised talent.'],
  ['What is the new Blue Visa?', 'A long-term residence visa introduced for 2025/26 aimed at skilled tradespeople and specialists.'],
  ['Can I look for a job in the UAE without a sponsor?', 'Yes — the Job Exploration Visa lets eligible skilled jobseekers enter and search for work for a limited period.'],
  ['What is WPS?', 'The Wage Protection System is the MOHRE mechanism ensuring employees are paid on time through approved channels.'],
];

export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ToolHero title="UAE Visa Types Guide 2026" subtitle="Understand every UAE work and residence visa, updated for the 2026 rules." />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {VISAS.map((v) => (
            <div key={v.name} className="rounded-xl border bg-white p-5">
              <h3 className="font-display font-bold text-navy-900">{v.name}</h3>
              <p className="mt-1 text-sm text-navy-700/70">{v.body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-bold text-navy-900">FAQ</h2>
        <div className="mt-4 space-y-3">
          {FAQ.map(([q, a]) => (
            <div key={q} className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold text-navy-900">{q}</h3>
              <p className="mt-1 text-sm text-navy-700/70">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/golden-visa-checker" className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600">Check Golden Visa eligibility →</Link>
          <Link href="/jobs/visa-provided" className="rounded-lg border bg-white px-5 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50">Browse visa-sponsored jobs</Link>
        </div>
      </div>
    </div>
  );
}
