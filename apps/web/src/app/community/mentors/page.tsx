'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Star, Loader2, Send } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@ddots/shared';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export default function MentorsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [prof, setProf] = useState('');
  const mentors = trpc.communityHub.getMentors.useQuery({ profession: prof || undefined });
  const request = trpc.communityHub.requestMentorSession.useMutation({
    onSuccess: () => { setOpenId(null); toast.success('Request sent'); },
    onError: (e) => toast.error(e.message),
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');

  function send(mentorId: string) {
    if (status !== 'authenticated') { router.push('/login'); return; }
    if (topic.trim().length < 2 || message.trim().length < 5) return toast.error('Add a topic and message');
    request.mutate({ mentorId, topic, message });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Find a mentor</h1></div>
        <Button asChild size="sm" variant="outline"><Link href="/community/become-mentor">Become a mentor</Link></Button>
      </div>

      <div className="mt-4">
        <Select value={prof} onChange={(e) => setProf(e.target.value)} className="max-w-xs"><option value="">All professions</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}</Select>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {mentors.isLoading ? <div className="col-span-2 flex justify-center py-12"><Loader2 className="animate-spin text-teal-500" /></div>
          : !mentors.data?.length ? <p className="col-span-2 rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No mentors yet. Be the first to volunteer!</p>
          : mentors.data.map((m) => (
            <div key={m.id} className="rounded-xl border bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700">{(m.name ?? 'M').slice(0, 1)}</span>
                <div><p className="font-semibold text-navy-900">{m.name ?? 'Mentor'}</p><p className="text-xs text-navy-700/60">{m.professions.slice(0, 2).join(', ')}</p></div>
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-navy-700/60"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> {m.ratingAvg || '—'}</span>
              </div>
              {m.bio && <p className="mt-2 line-clamp-2 text-sm text-navy-700/70">{m.bio}</p>}
              <div className="mt-2 flex flex-wrap gap-1">{m.topics.slice(0, 4).map((t) => <span key={t} className="rounded-full bg-navy-50 px-2 py-0.5 text-xs text-navy-700">{t}</span>)}</div>
              <p className="mt-2 text-xs text-navy-700/50">{m.totalSessions} sessions</p>
              {openId === m.userId ? (
                <div className="mt-3 space-y-2">
                  <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. CV review)" />
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What do you need help with?" />
                  <div className="flex gap-2"><Button size="sm" onClick={() => send(m.userId)} disabled={request.isPending}>{request.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send</Button><Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>Cancel</Button></div>
                </div>
              ) : (
                <Button className={cn('mt-3 w-full')} size="sm" variant="outline" onClick={() => { setOpenId(m.userId); setTopic(''); setMessage(''); }}>Request session</Button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
