import type { Metadata } from 'next';
import Link from 'next/link';
import { timeAgo, SITE } from '@ddots/shared';
import { getApi } from '@/trpc/server';
import { Badge } from '@/components/ui/primitives';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Career Blog',
  description: 'Career advice, salary insights and hiring tips for the UAE job market.',
  alternates: { canonical: `${SITE.url}/blog` },
};

export default async function BlogPage() {
  const api = await getApi();
  const posts = await api.content.blogList().catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-navy-900 md:text-4xl">Career Blog</h1>
      <p className="mt-2 text-navy-700/70">Advice, insights and hiring tips for the UAE job market.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="aspect-[16/9] bg-gradient-to-br from-teal-500 to-navy-900">
              {post.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.coverUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex flex-1 flex-col p-5">
              {post.category && <Badge className="mb-2 w-fit">{post.category}</Badge>}
              <h2 className="font-display text-lg font-bold text-navy-900 group-hover:text-teal-600">{post.title}</h2>
              {post.excerpt && <p className="mt-1 flex-1 text-sm text-navy-700/70">{post.excerpt}</p>}
              <p className="mt-3 text-xs text-navy-700/50">{post.publishedAt ? timeAgo(post.publishedAt) : 'Draft'}</p>
            </div>
          </Link>
        ))}
      </div>
      {posts.length === 0 && (
        <p className="mt-8 rounded-xl border bg-white p-12 text-center text-navy-700/60">No posts published yet.</p>
      )}
    </div>
  );
}
