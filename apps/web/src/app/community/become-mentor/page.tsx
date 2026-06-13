'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Loader2 } from 'lucide-react';
import { CATEGORIES } from '@ddots/shared';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const TOPICS = ['CV Review', 'Interview Prep', 'Salary Negotiation', 'Career Switch', 'UAE Work Culture', 'Visa Guidance'];

export default function BecomeMentorPage() {
  const router = useRouter();
  const apply = trpc.communityHub.applyMentor.useMutation({
    onSuccess: () => { toast.success('Application submitted for review'); router.push('/community/mentors'); },
    onError: (e) => toast.error(e.message),
  });
  const [bio, setBio] = useState('');
  const [profs, setProfs] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);

  function toggle(list: string[], set: (v: string[]) => void, v: string) { set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]); }
  function submit() {
    if (bio.trim().length < 20) return toast.error('Add a short bio (20+ chars)');
    if (!profs.length || !topics.length) return toast.error('Pick at least one profession and topic');
    apply.mutate({ bio, professions: profs, emirates: [], topics });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Become a mentor</h1></div>
      <p className="text-navy-700/60">Help UAE job seekers. Reviewed before going live; earn a Verified Mentor badge.</p>

      <div className="mt-5 space-y-5 rounded-xl border bg-white p-5">
        <div className="space-y-1.5"><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Your experience and how you can help" /></div>
        <div>
          <Label>Professions</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">{CATEGORIES.map((c) => <button key={c.slug} type="button" onClick={() => toggle(profs, setProfs, c.name)} className={cn('rounded-full px-3 py-1 text-xs font-medium', profs.includes(c.name) ? 'bg-teal-600 text-white' : 'bg-navy-50 text-navy-700')}>{c.name}</button>)}</div>
        </div>
        <div>
          <Label>Topics you can mentor on</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">{TOPICS.map((t) => <button key={t} type="button" onClick={() => toggle(topics, setTopics, t)} className={cn('rounded-full px-3 py-1 text-xs font-medium', topics.includes(t) ? 'bg-teal-600 text-white' : 'bg-navy-50 text-navy-700')}>{t}</button>)}</div>
        </div>
        <Button onClick={submit} disabled={apply.isPending}>{apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit application'}</Button>
      </div>
    </div>
  );
}
