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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePosted: (post.publishedAt ?? post.createdAt).toISOString(),
    description: post.excerpt ?? undefined,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
    </article>
  );
}
