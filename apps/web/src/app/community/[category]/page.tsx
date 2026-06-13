import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Briefcase, Banknote, MessageSquare, ArrowRight, Users } from 'lucide-react';
import { CATEGORIES, categoryBySlug, formatSalary, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { JobCard } from '@/components/job-card';
import { Badge } from '@/components/ui/primitives';

export const revalidate = 1800;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const cat = categoryBySlug(category);
  if (!cat) return { title: 'Community' };
  return {
    title: `${cat.name} Jobs Community UAE — Professionals, Salaries & Q&A`,
    description: `Connect with ${cat.name} professionals in the UAE. Jobs, salary insights, WhatsApp groups and community Q&A.`,
    alternates: { canonical: `${SITE.url}/community/${category}` },
  };
}

export default async function CommunityCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = categoryBySlug(category);
  if (!cat) notFound();
  const api = await getApi();
  const [jobsRes, salary, questions, groups] = await Promise.all([
    api.jobs.list({ category: category as never, perPage: 6, page: 1 }).catch(() => ({ jobs: [], total: 0 })),
    api.content.salaryGuide({ category }).catch(() => []),
    api.communityHub.getQuestions({ category, filter: 'top' }).catch(() => []),
    api.communityHub.getGroups({ category }).catch(() => []),
  ]);
  const sal = salary[0];

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Question', name: `How much do ${cat.name} professionals earn in UAE?`, acceptedAnswer: { '@type': 'Answer', text: sal ? `${cat.name} roles in the UAE typically pay ${formatSalary(sal.minSalary, sal.maxSalary, 'monthly', false)} per month based on community salary reports.` : `Salaries vary by experience and emirate.` } }],
  };

  return (
    <div className="bg-navy-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="bg-navy-900 py-12 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{cat.name} Professionals in UAE</h1>
          <p className="mt-2 max-w-2xl text-white/70">{cat.description}</p>
          {groups.length > 0 && <p className="mt-3 inline-flex items-center gap-2 text-sm text-teal-300"><Users className="h-4 w-4" /> {groups.length} WhatsApp group{groups.length === 1 ? '' : 's'} in this field</p>}
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        {sal && (
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-900"><Banknote className="h-5 w-5 text-teal-600" /> Salary insight</h2>
            <div className="mt-3 flex flex-wrap gap-6">
              <div><p className="text-xs text-navy-700/60">Min</p><p className="font-display text-xl font-bold text-navy-900">AED {sal.minSalary?.toLocaleString('en-AE')}</p></div>
              <div><p className="text-xs text-navy-700/60">Average</p><p className="font-display text-xl font-bold text-teal-700">AED {sal.avgSalary?.toLocaleString('en-AE')}</p></div>
              <div><p className="text-xs text-navy-700/60">Max</p><p className="font-display text-xl font-bold text-navy-900">AED {sal.maxSalary?.toLocaleString('en-AE')}</p></div>
            </div>
            <Link href="/salary-guide" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:underline">Full salary guide <ArrowRight className="h-3 w-3" /></Link>
          </div>
        )}

        <section>
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"><Briefcase className="h-5 w-5 text-teal-600" /> Latest {cat.name} jobs</h2><Link href={`/jobs?category=${category}`} className="text-sm font-semibold text-teal-600 hover:underline">View all →</Link></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{jobsRes.jobs.map((j) => <JobCard key={j.slug} job={j} />)}</div>
          {jobsRes.jobs.length === 0 && <p className="mt-3 rounded-xl border border-dashed bg-white py-8 text-center text-navy-700/60">No open jobs right now.</p>}
        </section>

        {groups.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"><MessageCircle className="h-5 w-5 text-teal-600" /> WhatsApp groups</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {groups.slice(0, 6).map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-4">
                  <Link href={`/whatsapp-groups/${g.slug}`} className="min-w-0"><p className="truncate font-semibold text-navy-900 hover:text-teal-600">{g.name}</p><p className="text-xs text-navy-700/60">{g.memberCount.toLocaleString('en-AE')} members</p></Link>
                  <a href={g.inviteUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white">Join</a>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"><MessageSquare className="h-5 w-5 text-teal-600" /> Community Q&amp;A</h2><Link href="/community/qa" className="text-sm font-semibold text-teal-600 hover:underline">Ask a question →</Link></div>
          <div className="mt-4 space-y-2">
            {questions.slice(0, 3).map((q) => (
              <Link key={q.id} href={`/community/qa/${q.slug}`} className="block rounded-xl border bg-white p-4 hover:border-teal-300"><p className="font-medium text-navy-900">{q.question}</p><p className="mt-1 text-xs text-navy-700/50">{q.answerCount} answers · {q.upvotes} upvotes</p></Link>
            ))}
            {questions.length === 0 && <p className="rounded-xl border border-dashed bg-white py-8 text-center text-navy-700/60">No questions yet. <Link href="/community/qa" className="font-semibold text-teal-600">Be the first →</Link></p>}
          </div>
        </section>
      </div>
    </div>
  );
}
