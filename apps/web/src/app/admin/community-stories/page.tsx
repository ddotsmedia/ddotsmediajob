'use client';

import { Sparkles, Loader2, Check, X, Star } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

export default function AdminCommunityStoriesPage() {
  const utils = trpc.useUtils();
  const pending = trpc.communityHub.adminPendingStories.useQuery();
  const decide = trpc.communityHub.adminDecideStory.useMutation({
    onSuccess: () => { utils.communityHub.adminPendingStories.invalidate(); toast.success('Updated'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Community success stories</h1></div>
      <p className="text-navy-700/60">Review and approve member-submitted stories.</p>

      <div className="mt-5 space-y-3">
        {pending.isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-500" /></div>
          : !pending.data?.length ? <p className="rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No stories awaiting review.</p>
          : pending.data.map((s) => (
            <div key={s.id} className="rounded-xl border bg-white p-4">
              <p className="font-semibold text-navy-900">{s.title}</p>
              <p className="text-xs text-navy-700/60">{[s.jobTitle, s.company, s.emirate].filter(Boolean).join(' · ')}</p>
              <p className="mt-2 line-clamp-4 text-sm text-navy-700/80">{s.story}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => decide.mutate({ id: s.id, approved: true })}><Check className="h-4 w-4" /> Approve</Button>
                <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: s.id, approved: true, featured: true })}><Star className="h-4 w-4" /> Approve + feature</Button>
                <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: s.id, approved: false })}><X className="h-4 w-4" /> Reject</Button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
