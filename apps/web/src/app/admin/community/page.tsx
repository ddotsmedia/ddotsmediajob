'use client';

import { toast } from 'sonner';
import { Loader2, Pin, Trash2, ArrowBigUp, MessageCircle } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';

export default function AdminCommunityPage() {
  const utils = trpc.useUtils();
  const threads = trpc.admin.communityThreads.useQuery();
  const inval = () => utils.admin.communityThreads.invalidate();
  const pin = trpc.admin.pinThread.useMutation({ onSuccess: () => { inval(); toast.success('Updated'); } });
  const del = trpc.admin.deleteThread.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); } });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Community Moderation</h1>
      <div className="mt-6 space-y-2">
        {threads.isLoading && <Loader2 className="animate-spin text-teal-500" />}
        {threads.data?.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl border bg-white p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {t.isPinned && <Badge>Pinned</Badge>}
                <p className="truncate font-semibold text-navy-900">{t.title ?? '(untitled)'}</p>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-navy-700/70">{t.body}</p>
              <p className="mt-1 text-xs text-navy-700/40"><ArrowBigUp className="inline h-3 w-3" /> {t.upvotes} · <MessageCircle className="inline h-3 w-3" /> {t.replyCount} · {timeAgo(t.createdAt)}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => pin.mutate({ id: t.id, pinned: !t.isPinned })} title="Pin"><Pin className={t.isPinned ? 'fill-teal-500 text-teal-500' : ''} /></Button>
              <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: t.id })}><Trash2 className="text-red-500" /></Button>
            </div>
          </div>
        ))}
        {threads.data?.length === 0 && <p className="rounded-xl border bg-white p-8 text-center text-navy-700/60">No threads.</p>}
      </div>
    </div>
  );
}
