'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ArrowBigUp, ArrowLeft, Loader2 } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Textarea, Badge } from '@/components/ui/primitives';

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const utils = trpc.useUtils();
  const [reply, setReply] = useState('');
  const thread = trpc.community.thread.useQuery({ id });

  const upvote = trpc.community.upvote.useMutation({ onSuccess: () => utils.community.thread.invalidate({ id }) });
  const postReply = trpc.community.reply.useMutation({
    onSuccess: () => {
      utils.community.thread.invalidate({ id });
      setReply('');
      toast.success('Reply posted');
    },
    onError: (e) => toast.error(e.message),
  });

  if (thread.isLoading) return <div className="mx-auto max-w-3xl px-4 py-12"><Loader2 className="animate-spin text-teal-500" /></div>;
  if (!thread.data) return null;
  const { post, replies } = thread.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/community" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Community
      </Link>

      <article className="mt-4 rounded-xl border bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-navy-900">{post.title}</h1>
          {post.categorySlug && <Badge variant="muted">{post.categorySlug}</Badge>}
        </div>
        <p className="mt-3 whitespace-pre-wrap text-navy-800">{post.body}</p>
        <div className="mt-4 flex items-center gap-3 text-xs text-navy-700/50">
          <button onClick={() => upvote.mutate({ id: post.id })} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 hover:border-teal-300 hover:text-teal-600">
            <ArrowBigUp className="h-3.5 w-3.5" /> {post.upvotes}
          </button>
          <span>{timeAgo(post.createdAt)}</span>
        </div>
      </article>

      <h2 className="mt-8 font-display text-lg font-bold text-navy-900">{replies.length} replies</h2>
      <div className="mt-3 space-y-3">
        {replies.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-4">
            <p className="whitespace-pre-wrap text-sm text-navy-800">{r.body}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-navy-700/50">
              <button onClick={() => upvote.mutate({ id: r.id })} className="inline-flex items-center gap-1 hover:text-teal-600">
                <ArrowBigUp className="h-3.5 w-3.5" /> {r.upvotes}
              </button>
              <span>{timeAgo(r.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>

      {status === 'authenticated' ? (
        <div className="mt-6 space-y-2 rounded-xl border bg-white p-4">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
          <Button onClick={() => postReply.mutate({ parentId: id, body: reply })} disabled={postReply.isPending || reply.trim().length < 2}>
            {postReply.isPending && <Loader2 className="animate-spin" />} Reply
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-sm text-navy-700/60"><Link href={`/login?callbackUrl=/community/${id}`} className="text-teal-600 hover:underline">Sign in</Link> to reply.</p>
      )}
    </div>
  );
}
