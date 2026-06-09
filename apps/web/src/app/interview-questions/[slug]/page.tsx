import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categoryBySlug, SITE, EMIRATES, CATEGORIES } from '@ddots/shared';
import { questionsFor } from './questions';

export const revalidate = 86400;

const ROLE_SLUGS: string[] = CATEGORIES.map((c) => c.slug);

function parse(slug: string): string | null {
  const m = slug.match(/^([a-z]+)-in-uae$/);
  if (!m) return null;
  return ROLE_SLUGS.includes(m[1]!) ? m[1]! : null;
}

export function generateStaticParams(): { slug: string }[] {
  return ROLE_SLUGS.map((c) => ({ slug: `${c}-in-uae` }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const role = parse(slug);
  if (!role) return {};
  const cat = categoryBySlug(role)!;
  const path = `/interview-questions/${slug}`;
  return {
    title: `${cat.name} Interview Questions in UAE 2026 — 20 Q&A | DdotsMediaJobs`,
    description: `Top 20 ${cat.name.toLowerCase()} interview questions and model answers for UAE jobs in 2026. Prepare for Dubai, Abu Dhabi and Sharjah interviews with role-specific and visa questions.`,
    alternates: { canonical: `${SITE.url}${path}` },
    openGraph: { title: `${cat.name} Interview Questions — UAE`, url: `${SITE.url}${path}`, images: [`/api/og?title=${encodeURIComponent(`${cat.name} Interview Questions`)}&subtitle=${encodeURIComponent('20 Q&A for UAE jobs')}`] },
  };
}

export default async function InterviewQuestionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const role = parse(slug);
  if (!role) notFound();
  const cat = categoryBySlug(role)!;
  const qa = questionsFor(role);

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Interview Questions', item: `${SITE.url}/interview-prep` },
      { '@type': 'ListItem', position: 3, name: `${cat.name} in UAE`, item: `${SITE.url}/interview-questions/${slug}` },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];

  const emirates = EMIRATES.slice(0, 6);

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b bg-navy-900 py-10">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="text-xs text-navy-100/60"><Link href="/" className="hover:text-teal-400">Home</Link> › <Link href="/interview-prep" className="hover:text-teal-400">Interview Prep</Link> › <span>{cat.name}</span></nav>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">{cat.name} Interview Questions in UAE — 20 Q&amp;A</h1>
          <p className="mt-2 max-w-2xl text-navy-100/80">The {qa.length} most common {cat.name.toLowerCase()} interview questions for UAE employers in 2026, with model answers. Includes role-specific and visa/availability questions every Dubai and Abu Dhabi hiring manager asks.</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <article className="mb-6 space-y-3 text-sm leading-relaxed text-navy-700/80">
          <p>Interviews in the UAE blend role-specific technical questions with practical checks on your visa status, notice period and salary expectations. Employers also value cultural fit in a highly multicultural workforce. Prepare concise, evidence-based answers using the STAR method (Situation, Task, Action, Result).</p>
        </article>

        <ol className="space-y-4">
          {qa.map((item, i) => (
            <li key={item.q} className="rounded-xl border bg-white p-5">
              <h2 className="font-display text-base font-bold text-navy-900"><span className="text-teal-600">{i + 1}.</span> {item.q}</h2>
              <p className="mt-2 text-sm text-navy-700/75">{item.a}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-xl border border-teal-200 bg-teal-50 p-5">
          <h2 className="font-display text-lg font-bold text-navy-900">Practice with AI</h2>
          <p className="mt-1 text-sm text-navy-700/70">Get tailored questions and instant feedback on your answers.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/interview-prep" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">AI Interview Prep</Link>
            <Link href="/dashboard/star-coach" className="rounded-lg border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100">STAR Answer Coach</Link>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-navy-900">Find {cat.name.toLowerCase()} jobs in the UAE</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {emirates.map((e) => (
              <Link key={e.slug} href={`/jobs/${role}-jobs-in-${e.slug}`} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-700 hover:bg-teal-100">{cat.name} in {e.name}</Link>
            ))}
            <Link href={`/category/${role}`} className="rounded-full border border-navy-200 bg-white px-3 py-1 text-sm text-navy-700 hover:bg-navy-50">All {cat.name} jobs</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
