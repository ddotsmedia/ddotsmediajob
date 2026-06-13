import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TRPCError } from '@trpc/server';
import { categoryBySlug, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';
import { Answers } from './answers';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  try {
    const api = await getApi();
    return await api.communityHub.getQuestion({ slug });
  } catch (err) {
    if (err instanceof TRPCError && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: 'Question not found' };
  const q = data.question.question.slice(0, 110);
  return {
    title: `${q} — DdotsMediaJobs Community`,
    description: data.answers[0]?.answer.slice(0, 160) ?? `Community answers about UAE jobs and careers.`,
    alternates: { canonical: `${SITE.url}/community/qa/${slug}` },
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { question, answers } = data;

  const faqJsonLd = answers.length ? {
    '@context': 'https://schema.org', '@type': 'QAPage',
    mainEntity: { '@type': 'Question', name: question.question, answerCount: answers.length, acceptedAnswer: { '@type': 'Answer', text: answers[0]!.answer } },
  } : null;

  return (
    <div className="bg-navy-50/30">
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <div className="mx-auto max-w-3xl px-4 py-8">
        {question.categorySlug && <Badge variant="muted">{categoryBySlug(question.categorySlug)?.name ?? question.categorySlug}</Badge>}
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-900">{question.question}</h1>
        <Answers slug={slug} questionId={question.id} />
      </div>
    </div>
  );
}
