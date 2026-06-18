import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ShieldCheck, TrendingUp, Sparkles, Gauge, Languages, Download, Linkedin, Building2, ArrowRight } from 'lucide-react';
import { SITE } from '@ddots/shared';
import { Button } from '@/components/ui/button';

const OG = `/api/og?title=${encodeURIComponent('Free ATS CV Builder UAE')}&subtitle=${encodeURIComponent('AI-powered, ATS-optimized, UAE templates')}&tag=${encodeURIComponent('CV Builder')}`;

export const metadata: Metadata = {
  title: { absolute: 'Free ATS CV Builder UAE 2026 — Create Professional Resume | DdotsMediaJobs' },
  description: 'Build a professional ATS-optimized CV for UAE jobs. Free CV builder with AI assistance, UAE-specific templates, Arabic support. Download PDF instantly.',
  keywords: ['ATS CV builder UAE', 'resume builder Dubai', 'professional CV format UAE', 'free CV maker'],
  alternates: { canonical: `${SITE.url}/cv-builder` },
  openGraph: { type: 'website', title: 'Free ATS CV Builder UAE 2026 | DdotsMediaJobs', description: 'AI-powered ATS CV builder for UAE jobs. Free. Arabic + English. Download PDF.', url: `${SITE.url}/cv-builder`, images: [OG] },
  twitter: { card: 'summary_large_image', images: [OG] },
};

const FAQS = [
  { q: 'Is this CV builder free?', a: 'Yes, completely free for all jobseekers on DdotsMediaJobs.' },
  { q: 'Will my CV pass ATS systems?', a: 'Our templates are specifically designed to pass ATS used by UAE employers.' },
  { q: 'Can I create an Arabic CV?', a: 'Yes, our CV builder supports Arabic with proper RTL formatting.' },
  { q: 'How long should a UAE CV be?', a: '1-2 pages is ideal for UAE employers.' },
  { q: 'What format should I save my CV?', a: 'PDF is recommended for ATS compatibility.' },
  { q: 'Can I use this for jobs outside UAE?', a: 'Yes, our templates work for GCC and international applications.' },
];

const TIPS = [
  ['Use standard section headings', 'Stick to “Work Experience”, “Education”, “Skills” — ATS parsers look for these exact labels.'],
  ['Avoid tables and columns', 'Multi-column layouts and tables confuse parsers and scramble your data.'],
  ['Include keywords from the job description', 'Mirror the exact skills and titles the employer lists.'],
  ['Use standard fonts (Arial, Calibri)', 'Decorative fonts may not render or parse correctly.'],
  ['Save as PDF, not Word', 'PDF preserves layout and is widely ATS-compatible.'],
  ['Include UAE phone format (+971)', 'Use the full international format so recruiters can reach you.'],
  ['Add your LinkedIn profile URL', 'A complete profile builds trust and adds keywords.'],
  ['Quantify achievements with numbers', '“Increased sales 30%” beats “responsible for sales”.'],
  ['Keep to 1-2 pages max', 'UAE recruiters skim — be concise and relevant.'],
  ['Use active verbs (Managed, Led, Achieved)', 'Strong verbs signal impact and ownership.'],
];

const FEATURES = [
  { icon: Sparkles, title: 'AI Content Suggestions', desc: 'Haiku-powered phrasing for bullets and summaries.' },
  { icon: Gauge, title: 'ATS Score Checker', desc: 'Real-time score so you fix issues before applying.' },
  { icon: FileText, title: 'UAE-Specific Templates', desc: 'Three recruiter-approved designs for the UAE market.' },
  { icon: Languages, title: 'Arabic & English Support', desc: 'Build in either language with correct RTL formatting.' },
  { icon: Download, title: 'One-Click PDF Download', desc: 'Export an ATS-ready PDF instantly — free.' },
  { icon: Linkedin, title: 'LinkedIn Import', desc: 'Pull your profile in seconds (coming soon).' },
];

export default function CvBuilderPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'DdotsMediaJobs ATS CV Builder',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: `${SITE.url}/cv-builder`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'AED' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: '10 ATS Tips for UAE Job Applications',
      step: TIPS.map(([name, text], i) => ({ '@type': 'HowToStep', position: i + 1, name, text })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="bg-navy-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center md:py-20">
          <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">Build an ATS-Optimized CV for UAE Jobs — Free</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-navy-100/80">Our AI-powered CV builder creates professional resumes that pass Applicant Tracking Systems used by top UAE employers.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild variant="accent" size="lg"><Link href="/dashboard/cv">Build My CV Free <ArrowRight /></Link></Button>
            <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10"><Link href="#templates">View CV Templates</Link></Button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-navy-100/70">
            <span>50,000+ CVs created</span><span>·</span><span>95% ATS pass rate</span><span>·</span><span>UAE-optimized</span>
          </div>
        </div>
      </section>

      {/* Why ATS matters */}
      <Section title="Why Your CV Needs to Pass ATS in UAE">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard icon={Building2} title="90% of UAE employers use ATS" desc="Applicant Tracking Systems screen CVs automatically before anyone reads them." />
          <InfoCard icon={ShieldCheck} title="Most CVs rejected before human review" desc="A wrong format means your CV never reaches a recruiter." />
          <InfoCard icon={TrendingUp} title="Right format = 3x more interview calls" desc="ATS-friendly CVs surface higher and get shortlisted faster." />
        </div>
      </Section>

      {/* Features */}
      <Section title="Everything You Need in One CV Builder" tinted>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-white p-5">
              <f.icon className="h-6 w-6 text-teal-600" />
              <h3 className="mt-3 font-display font-bold text-navy-900">{f.title}</h3>
              <p className="mt-1 text-sm text-navy-700/70">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section title="Create Your Professional CV in 3 Steps">
        <div className="grid gap-4 md:grid-cols-3">
          {[['1', 'Fill your details', 'A guided form captures your experience, skills and education.'], ['2', 'AI enhances your content', 'Get stronger bullet points and an ATS score in real time.'], ['3', 'Download ATS-ready PDF', 'Export instantly and start applying.']].map(([n, t, d]) => (
            <div key={n} className="rounded-xl border bg-white p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 font-display font-bold text-white">{n}</span>
              <h3 className="mt-3 font-display font-bold text-navy-900">{t}</h3>
              <p className="mt-1 text-sm text-navy-700/70">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center"><Button asChild variant="accent" size="lg"><Link href="/dashboard/cv">Start Building Free <ArrowRight /></Link></Button></div>
      </Section>

      {/* Templates */}
      <Section id="templates" title="Professional CV Templates for UAE Jobs" tinted>
        <div className="grid gap-4 md:grid-cols-3">
          {[['Professional', 'Most popular', 'bg-navy-100'], ['Modern', 'Creative roles', 'bg-teal-100'], ['Minimal', 'Executives', 'bg-amber-100']].map(([name, tag, bg]) => (
            <div key={name} className="overflow-hidden rounded-xl border bg-white">
              <div className={`flex h-44 items-center justify-center ${bg}`}><FileText className="h-14 w-14 text-navy-400" /></div>
              <div className="p-4">
                <div className="flex items-center justify-between"><h3 className="font-display font-bold text-navy-900">{name}</h3><span className="text-xs text-navy-700/50">{tag}</span></div>
                <Button asChild variant="outline" className="mt-3 w-full"><Link href="/dashboard/cv">Use This Template</Link></Button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ATS tips */}
      <Section title="10 ATS Tips for UAE Job Applications">
        <ol className="grid gap-3 sm:grid-cols-2">
          {TIPS.map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-xl border bg-white p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">{i + 1}</span>
              <span><span className="block font-semibold text-navy-900">{t}</span><span className="block text-sm text-navy-700/70">{d}</span></span>
            </li>
          ))}
        </ol>
      </Section>

      {/* FAQ */}
      <Section title="Frequently Asked Questions" tinted>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-xl border bg-white p-4">
              <summary className="cursor-pointer font-semibold text-navy-900">{f.q}</summary>
              <p className="mt-2 text-sm text-navy-700/70">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* Related tools */}
      <Section title="More Free Career Tools">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([['ATS Score Checker', '/tools/ats-checker'], ['Salary Guide', '/salary-guide'], ['Interview Prep', '/interview-prep'], ['Cover Letter Generator', '/dashboard/cv']] as const).map(([t, h]) => (
            <Link key={h} href={h} className="rounded-xl border bg-white p-4 text-sm font-semibold text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-50">{t} →</Link>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <section className="bg-navy-900">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center">
          <h2 className="font-display text-2xl font-bold text-white md:text-3xl">Ready to Land Your Dream Job in UAE?</h2>
          <p className="mt-2 text-navy-100/80">Join 50,000+ professionals who built their CV with DdotsMediaJobs.</p>
          <Button asChild variant="accent" size="lg" className="mt-6"><Link href="/dashboard/cv">Build My Free CV Now <ArrowRight /></Link></Button>
        </div>
      </section>
    </div>
  );
}

function Section({ id, title, tinted, children }: { id?: string; title: string; tinted?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={tinted ? 'bg-navy-50/40' : 'bg-white'}>
      <div className="mx-auto max-w-5xl px-4 py-14 scroll-mt-20">
        <h2 className="font-display text-2xl font-bold text-navy-900 md:text-3xl">{title}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

function InfoCard({ icon: Icon, title, desc }: { icon: typeof Building2; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <Icon className="h-6 w-6 text-teal-600" />
      <h3 className="mt-3 font-display font-bold text-navy-900">{title}</h3>
      <p className="mt-1 text-sm text-navy-700/70">{desc}</p>
    </div>
  );
}
