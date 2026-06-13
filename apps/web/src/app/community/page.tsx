'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { MessagesSquare, Plus, ArrowBigUp, MessageCircle, Loader2 } from 'lucide-react';
import { CATEGORIES, categoryBySlug, timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, Badge } from '@/components/ui/primitives';

export default function CommunityPage() {
  const { status } = useSession();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const threads = trpc.community.threads.useQuery({});

  const create = trpc.community.createThread.useMutation({
    onSuccess: () => {
      utils.community.threads.invalidate();
      setOpen(false);
      toast.success('Posted to the community');
    },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({
      title: String(f.get('title')),
      body: String(f.get('body')),
      categorySlug: String(f.get('category')) || undefined,
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-6 w-6 text-teal-500" />
          <h1 className="font-display text-3xl font-bold text-navy-900">Community</h1>
        </div>
        {status === 'authenticated' ? (
          <Button onClick={() => setOpen((v) => !v)}><Plus /> Ask / Post</Button>
        ) : (
          <Button asChild variant="outline"><Link href="/login?callbackUrl=/community">Sign in to post</Link></Button>
        )}
      </div>
      <p className="mt-1 text-navy-700/60">Ask questions and share advice with UAE jobseekers and employers.</p>

      <div className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="font-display text-lg font-bold text-navy-900">Browse by profession</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/community/profession/${c.slug}`} className="rounded-full bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-teal-50 hover:text-teal-700">
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl border bg-white p-5">
          <div className="space-y-1.5"><Label>Title</Label><Input name="title" required placeholder="What's your question?" /></div>
          <div className="space-y-1.5"><Label>Details</Label><Textarea name="body" required /></div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select name="category"><option value="">General</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select>
          </div>
          <Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="animate-spin" />} Post</Button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {threads.isLoading && <Loader2 className="animate-spin text-teal-500" />}
        {threads.data?.length === 0 && (
          <p className="rounded-xl border bg-white p-12 text-center text-navy-700/60">No discussions yet. Be the first to post.</p>
        )}
        {threads.data?.map((t) => (
          <Link key={t.id} href={`/community/${t.id}`} className="block rounded-xl border bg-white p-5 transition-all hover:border-teal-300 hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display font-bold text-navy-900">{t.title}</h2>
              {t.categorySlug && <Badge variant="muted">{categoryBySlug(t.categorySlug)?.name ?? t.categorySlug}</Badge>}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-navy-700/70">{t.body}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-navy-700/50">
              <span className="inline-flex items-center gap-1"><ArrowBigUp className="h-3.5 w-3.5" /> {t.upvotes}</span>
              <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {t.replyCount}</span>
              <span>{timeAgo(t.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
