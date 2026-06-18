import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TRPCError } from '@trpc/server';
import { timeAgo, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';

export const revalidate = 600;

async function load(slug: string) {
  try {
    const api = await getApi();
    return await api.content.blogBySlug({ slug });
  } catch (err) {
    if (err instanceof TRPCError && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) return { title: 'Post not found' };
  return {
    title: post.title,
    description: post.excerpt ?? post.content.slice(0, 155),
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: 'article',
      images: [`/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('DdotsMediaJobs Blog')}&tag=${encodeURIComponent('Blog')}`],
    },
    alternates: { canonical: `${SITE.url}/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) notFound();

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.coverUrl ?? undefined,
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: SITE.name },
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    mainEntityOfPage: `${SITE.url}/blog/${post.slug}`,
  };

  // FAQs: prefer the stored column; fall back to parsing the rendered markdown.
  const faqs = (post.faqs?.length ? post.faqs : parseFaqs(post.content)).slice(0, 20);
  const faqLd = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }
    : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <Link href="/blog" className="text-sm text-teal-600 hover:underline">← Back to blog</Link>
      {post.category && <Badge className="mt-4 block w-fit">{post.category}</Badge>}
      <h1 className="mt-3 font-display text-3xl font-extrabold text-navy-900 md:text-4xl">{post.title}</h1>
      <p className="mt-2 text-sm text-navy-700/50">{post.publishedAt ? timeAgo(post.publishedAt) : 'Draft'} · {post.viewCount} views</p>
      {/<[a-z][\s\S]*>/i.test(post.content) ? (
        <div
          className="prose prose-slate mt-8 max-w-none prose-headings:font-display"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      ) : (
        <div className="prose prose-slate mt-8 max-w-none whitespace-pre-wrap prose-headings:font-display">{post.content}</div>
      )}

      {/* Internal linking — drive readers to live job search */}
      {(() => {
        const kw = (post.tags?.[0] ?? post.category ?? '').toString().replace(/-/g, ' ').trim();
        const q = kw ? `/jobs?q=${encodeURIComponent(kw)}` : '/jobs';
        return (
          <div className="mt-10 rounded-xl border border-teal-200 bg-teal-50/60 p-6 text-center">
            <h2 className="font-display text-lg font-bold text-navy-900">Latest {kw ? `${kw} ` : ''}jobs in the UAE</h2>
            <p className="mt-1 text-sm text-navy-700/70">Browse live vacancies and apply free on DdotsMediaJobs.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href={q} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">View {kw ? `${kw} ` : ''}jobs →</Link>
              <Link href="/jobs" className="rounded-lg border border-teal-300 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100">All UAE jobs</Link>
            </div>
          </div>
        );
      })()}
    </article>
  );
}

/** Parse "### Question\n\nAnswer" blocks under the FAQ heading from rendered markdown. */
function parseFaqs(content: string): { q: string; a: string }[] {
  const idx = content.search(/##\s*(Frequently Asked Questions|FAQ)/i);
  const section = idx >= 0 ? content.slice(idx) : content;
  const out: { q: string; a: string }[] = [];
  const re = /^###\s+(.+?)[ \t]*\r?\n([\s\S]*?)(?=^###\s|^##\s|(?![\s\S]))/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const q = m[1]?.trim();
    const a = m[2]?.replace(/[#*]/g, '').trim();
    if (q && a) out.push({ q, a });
  }
  return out;
}
