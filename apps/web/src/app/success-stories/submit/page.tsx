'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import { EMIRATES } from '@ddots/shared';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select } from '@/components/ui/primitives';

export default function SubmitStoryPage() {
  const router = useRouter();
  const groups = trpc.communityHub.getGroups.useQuery();
  const submit = trpc.communityHub.submitStory.useMutation({
    onSuccess: () => { toast.success('Story submitted for review — thank you!'); router.push('/success-stories'); },
    onError: (e) => toast.error(e.message),
  });
  const [f, setF] = useState({ title: '', story: '', jobTitle: '', company: '', emirate: '', groupId: '', weeks: '', tips: '' });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  function go() {
    if (f.title.trim().length < 5) return toast.error('Add a title');
    if (f.story.trim().length < 100) return toast.error('Story must be at least 100 characters');
    submit.mutate({ title: f.title, story: f.story, jobTitle: f.jobTitle || undefined, company: f.company || undefined, emirate: f.emirate || undefined, groupId: f.groupId || undefined, weeksToHire: f.weeks ? Number(f.weeks) : undefined, tips: f.tips || undefined });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Share your success story</h1></div>
      <p className="text-navy-700/60">Inspire others. Approved stories appear on the site and your WhatsApp group page.</p>

      <div className="mt-5 space-y-4 rounded-xl border bg-white p-5">
        <div className="space-y-1.5"><Label>Title</Label><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="How I got my dream nursing job in Dubai" /></div>
        <div className="space-y-1.5"><Label>Your story (100-4000 chars)</Label><Textarea className="min-h-[160px]" value={f.story} onChange={(e) => set('story', e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Job title</Label><Input value={f.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Company</Label><Input value={f.company} onChange={(e) => set('company', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Emirate</Label><Select value={f.emirate} onChange={(e) => set('emirate', e.target.value)}><option value="">Select</option>{EMIRATES.map((em) => <option key={em.slug} value={em.slug}>{em.name}</option>)}</Select></div>
          <div className="space-y-1.5"><Label>Weeks to hire</Label><Input type="number" value={f.weeks} onChange={(e) => set('weeks', e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Which WhatsApp group helped you?</Label><Select value={f.groupId} onChange={(e) => set('groupId', e.target.value)}><option value="">None / not sure</option>{groups.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></div>
        <div className="space-y-1.5"><Label>Tips for others (optional)</Label><Textarea value={f.tips} onChange={(e) => set('tips', e.target.value)} /></div>
        <Button onClick={go} disabled={submit.isPending}>{submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit story'}</Button>
      </div>
    </div>
  );
}
