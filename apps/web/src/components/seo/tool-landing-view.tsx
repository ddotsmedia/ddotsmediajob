import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { SITE } from '@ddots/shared';

export type ToolConfig = {
  h1: string;
  subtitle: string;
  intro: string[];
  how: string[];
  ctaHref: string;
  ctaLabel: string;
  faq: { q: string; a: string }[];
  canonical: string;
};

export function ToolLandingView({ config }: { config: ToolConfig }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b bg-navy-900 py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl">{config.h1}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-navy-100/80">{config.subtitle}</p>
          <Link href={config.ctaHref} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-400">
            {config.ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <article className="space-y-3 text-sm leading-relaxed text-navy-700/80">
          {config.intro.map((p, i) => <p key={i}>{p}</p>)}
        </article>

        <section className="mt-8 rounded-xl border bg-white p-5">
          <h2 className="font-display text-lg font-bold text-navy-900">How it works</h2>
          <ol className="mt-3 space-y-2">
            {config.how.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-navy-700/80">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{i + 1}</span> {s}
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-6 text-center">
          <Link href={config.ctaHref} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700">
            <Check className="h-4 w-4" /> {config.ctaLabel}
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-navy-900">Frequently asked questions</h2>
          <div className="mt-4 space-y-3">
            {config.faq.map((f) => (
              <div key={f.q} className="rounded-xl border bg-white p-4"><h3 className="font-semibold text-navy-900">{f.q}</h3><p className="mt-1 text-sm text-navy-700/70">{f.a}</p></div>
            ))}
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-navy-700/40">{SITE.name} — free AI tools for UAE jobseekers.</p>
      </div>
    </div>
  );
}
