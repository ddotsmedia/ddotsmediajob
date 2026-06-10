'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Star, Loader2, Plus, Trash2, X } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Input, Label } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

export default function AdminSuccessStoriesPage() {
  const utils = trpc.useUtils();
  const all = trpc.successStories.all.useQuery();
  const inval = () => utils.successStories.all.invalidate();
  const create = trpc.successStories.create.useMutation({ onSuccess: () => { inval(); toast.success('Story added'); reset(); } });
  const toggle = trpc.successStories.togglePublish.useMutation({ onSuccess: inval });
  const remove = trpc.successStories.remove.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); } });

  const [show, setShow] = useState(false);
  const [f, setF] = useState({ seekerName: '', role: '', company: '', emirate: '', timeToHire: '', story: '', tips: '' });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  function reset() { setShow(false); setF({ seekerName: '', role: '', company: '', emirate: '', timeToHire: '', story: '', tips: '' }); }

  const valid = f.seekerName.trim() && f.role.trim() && f.story.trim().length >= 10;
  function submit() {
    if (!valid) { toast.error('Name, role and a story (10+ chars) are required'); return; }
    create.mutate({
      seekerName: f.seekerName, role: f.role, story: f.story, isPublished: true,
      company: f.company || undefined, emirate: f.emirate || undefined, timeToHire: f.timeToHire || undefined, tips: f.tips || undefined,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Star className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Success Stories</h1></div>
        <Button onClick={() => setShow((s) => !s)}>{show ? <X /> : <Plus />} {show ? 'Cancel' : 'New story'}</Button>
      </div>

      {show && (
        <div className="mt-6 space-y-3 rounded-xl border bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={f.seekerName} onChange={(e) => set('seekerName', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Role hired for</Label><Input value={f.role} onChange={(e) => set('role', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Company (optional)</Label><Input value={f.company} onChange={(e) => set('company', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Emirate (optional)</Label><Input value={f.emirate} onChange={(e) => set('emirate', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Time to hire (optional)</Label><Input value={f.timeToHire} onChange={(e) => set('timeToHire', e.target.value)} placeholder="e.g. 3 weeks" /></div>
          </div>
          <div className="space-y-1.5"><Label>Story</Label><textarea className="w-full rounded-lg border p-3" rows={4} value={f.story} onChange={(e) => set('story', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Tips (optional)</Label><textarea className="w-full rounded-lg border p-3" rows={2} value={f.tips} onChange={(e) => set('tips', e.target.value)} /></div>
          <Button onClick={submit} disabled={create.isPending || !valid}>{create.isPending ? <Loader2 className="animate-spin" /> : null} Publish story</Button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {all.isLoading ? <Loader2 className="animate-spin text-teal-500" /> : all.data && all.data.length > 0 ? (
          all.data.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div className="min-w-0"><p className="font-semibold text-navy-900">{s.seekerName} — {s.role}</p><p className="truncate text-sm text-navy-700/60">{s.story}</p></div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-sm text-navy-700/70"><input type="checkbox" checked={s.isPublished} onChange={(e) => toggle.mutate({ id: s.id, isPublished: e.target.checked })} /> Published</label>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete this story?')) remove.mutate({ id: s.id }); }}><Trash2 className="text-red-500" /></Button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border bg-white p-10 text-center text-navy-700/60">No stories yet.</p>
        )}
      </div>
    </div>
  );
}
