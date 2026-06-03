'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Badge } from '@/components/ui/primitives';
import { TiptapEditor } from '@/components/tiptap-editor';

export default function AdminBlogPage() {
  const utils = trpc.useUtils();
  const posts = trpc.content.blogList.useQuery({ page: 1 });
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('<p></p>');

  const upsert = trpc.content.blogUpsert.useMutation({
    onSuccess: () => {
      utils.content.blogList.invalidate();
      setOpen(false);
      setContent('<p></p>');
      toast.success('Post saved');
    },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (content.replace(/<[^>]*>/g, '').trim().length < 10) return toast.error('Content is too short');
    upsert.mutate({
      title: String(f.get('title')),
      excerpt: String(f.get('excerpt')) || undefined,
      content,
      category: String(f.get('category')) || undefined,
      tags: String(f.get('tags')).split(',').map((s) => s.trim()).filter(Boolean),
      isPublished: f.get('publish') === 'on',
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Blog Editor</h1>
        <Button onClick={() => setOpen((v) => !v)}><Plus /> New Post</Button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border bg-white p-6">
          <div className="space-y-1.5"><Label>Title</Label><Input name="title" required /></div>
          <div className="space-y-1.5"><Label>Excerpt</Label><Input name="excerpt" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Category</Label><Input name="category" placeholder="Career Advice" /></div>
            <div className="space-y-1.5"><Label>Tags (comma-separated)</Label><Input name="tags" /></div>
          </div>
          <div className="space-y-1.5"><Label>Content</Label><TiptapEditor value={content} onChange={setContent} /></div>
          <label className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" name="publish" className="h-4 w-4 rounded text-teal-600" /> Publish immediately
          </label>
          <Button type="submit" disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="animate-spin" />} Save post
          </Button>
        </form>
      )}

      <div className="mt-6 divide-y rounded-xl border bg-white">
        {posts.data?.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-navy-900">{p.title}</p>
              <p className="text-sm text-navy-700/60">{p.category}</p>
            </div>
            <Badge variant={p.isPublished ? 'success' : 'muted'}>{p.isPublished ? 'Published' : 'Draft'}</Badge>
          </div>
        ))}
        {posts.data?.length === 0 && <p className="p-8 text-center text-navy-700/60">No posts yet.</p>}
      </div>
    </div>
  );
}
