import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, FileCheck, Search, Star, ArrowRight } from 'lucide-react';
import { VerifiedDirectory } from './directory';

export const metadata: Metadata = {
  title: 'Verified UAE Employers — Trusted Companies Hiring in UAE',
  description:
    'Browse verified UAE employers checked by DET trade licence or MOHRE registration. Hire and apply with confidence.',
  alternates: { canonical: 'https://ddotsmediajobs.com/verified-employers' },
};

const FAQ = [
  { q: 'How do I verify my company on DdotsMediaJobs?', a: 'Go to your employer profile, submit your DET trade licence or MOHRE registration number with a document upload, and our team reviews it — usually within 1–2 business days.' },
  { q: 'What does the verified badge mean?', a: 'It means the company’s legal trading status in the UAE was checked against its DET, MOHRE or free-zone (e.g. SHAMS) registration.' },
  { q: 'Is verification free?', a: 'Yes — employer verification is free and gives your listings a trust badge and priority placement.' },
];

export default function VerifiedEmployersPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="bg-navy-900 py-12 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"><ShieldCheck className="h-4 w-4" /> Trusted hiring</span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Verified UAE Employers — Hire with Confidence</h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">All employers verified by DET trade licence or MOHRE registration.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-12">
        <VerifiedDirectory />

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="font-display text-xl font-bold text-navy-900">How to get verified</h2>
            <ol className="mt-4 space-y-3 text-sm text-navy-700/80">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">1</span> Open your employer profile and start the verification request.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">2</span> Submit your DET / MOHRE / free-zone licence number + document.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">3</span> Our team reviews and awards your verified badge.</li>
            </ol>
            <Link href="/employer/verify" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700">Apply for Verification <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="font-display text-xl font-bold text-navy-900">Benefits of verification</h2>
            <ul className="mt-4 space-y-3 text-sm text-navy-700/80">
              <li className="flex items-center gap-2"><FileCheck className="h-4 w-4 text-teal-600" /> Trust badge on every job listing</li>
              <li className="flex items-center gap-2"><Search className="h-4 w-4 text-teal-600" /> Priority placement in search & directory</li>
              <li className="flex items-center gap-2"><Star className="h-4 w-4 text-teal-600" /> Higher candidate response rates</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-navy-900">Verification FAQ</h2>
          <div className="mt-4 divide-y rounded-xl border bg-white">
            {FAQ.map((f) => (
              <div key={f.q} className="p-5">
                <p className="font-semibold text-navy-900">{f.q}</p>
                <p className="mt-1 text-sm text-navy-700/70">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
