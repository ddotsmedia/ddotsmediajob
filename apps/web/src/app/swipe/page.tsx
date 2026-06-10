'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpring, animated, to } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { toast } from 'sonner';
import { Heart, X, Send, Loader2, MapPin, Banknote, Briefcase, RotateCcw } from 'lucide-react';
import { formatSalary, emirateBySlug, categoryBySlug } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Badge } from '@/components/ui/primitives';

export default function SwipePage() {
  const router = useRouter();
  const q = trpc.jobs.list.useQuery({ page: 1, sort: 'newest' } as never);
  const save = trpc.jobseekers.toggleSave.useMutation();
  const jobs = (q.data?.jobs ?? []) as Array<{ id: string; slug: string; title: string; emirateSlug: string; categorySlug: string; location: string | null; jobType: string; salaryMin: number | null; salaryMax: number | null; salaryPeriod: string; salaryHidden: boolean; isRemote: boolean; isUrgent: boolean; isAnonymous?: boolean; company?: { name: string | null } | null }>;
  const [idx, setIdx] = useState(0);
  const [{ x, y, rot }, api] = useSpring(() => ({ x: 0, y: 0, rot: 0 }));

  const current = jobs[idx];

  function advance() {
    api.start({ x: 0, y: 0, rot: 0, immediate: true });
    setIdx((i) => i + 1);
  }

  function act(kind: 'save' | 'skip' | 'apply') {
    if (!current) return;
    if (kind === 'apply') { router.push(`/jobs/${current.slug}`); return; }
    if (kind === 'save') save.mutate({ jobId: current.id }, { onSuccess: () => toast.success('Saved'), onError: () => toast.error('Log in to save jobs') });
    const dir = kind === 'save' ? 1 : -1;
    api.start({ x: dir * 500, rot: dir * 20 });
    setTimeout(advance, 180);
  }

  const bind = useDrag(({ down, movement: [mx, my] }) => {
    if (down) { api.start({ x: mx, y: my, rot: mx / 20, immediate: true }); return; }
    if (mx > 120) act('save');
    else if (mx < -120) act('skip');
    else if (my < -120) act('apply');
    else api.start({ x: 0, y: 0, rot: 0 });
  });

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-navy-900">Swipe Jobs</h1>
      <p className="text-sm text-navy-700/60">Swipe right to save, left to skip, up to open. Or use the buttons.</p>

      <div className="relative mt-6 h-[420px]">
        {q.isLoading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>
        ) : !current ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border bg-white text-center text-navy-700/60">
            <p>That&apos;s all for now.</p>
            <button onClick={() => setIdx(0)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50"><RotateCcw className="h-4 w-4" /> Start over</button>
          </div>
        ) : (
          <animated.div
            {...bind()}
            style={{ x, y, transform: to([x, y, rot], (xv, yv, r) => `translate3d(${xv}px, ${yv}px, 0) rotate(${r}deg)`), touchAction: 'none' }}
            className="absolute inset-0 cursor-grab touch-none select-none rounded-2xl border bg-white p-6 shadow-lg active:cursor-grabbing"
          >
            <div className="flex h-full flex-col">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-50"><Briefcase className="h-5 w-5 text-teal-600" /></div>
              <h2 className="mt-4 font-display text-xl font-bold text-navy-900">{current.title}</h2>
              <p className="text-navy-700/70">{current.isAnonymous ? 'Confidential Company' : current.company?.name ?? 'Employer'}</p>
              <div className="mt-4 space-y-2 text-sm text-navy-700/80">
                <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {current.location ?? emirateBySlug(current.emirateSlug)?.name}</p>
                <p className="inline-flex items-center gap-2 font-semibold text-teal-700"><Banknote className="h-4 w-4" /> {formatSalary(current.salaryMin, current.salaryMax, current.salaryPeriod, current.salaryHidden)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {categoryBySlug(current.categorySlug) && <Badge variant="muted">{categoryBySlug(current.categorySlug)!.name}</Badge>}
                {current.isRemote && <Badge variant="success">Remote</Badge>}
                {current.isUrgent && <Badge variant="urgent">Urgent</Badge>}
                <Badge variant="outline" className="capitalize">{current.jobType.replace('-', ' ')}</Badge>
              </div>
              <p className="mt-auto text-center text-xs text-navy-700/40">{idx + 1} of {jobs.length}</p>
            </div>
          </animated.div>
        )}
      </div>

      {current && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button onClick={() => act('skip')} aria-label="Skip" className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-200 text-red-500 hover:bg-red-50"><X className="h-6 w-6" /></button>
          <button onClick={() => act('apply')} aria-label="Open" className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-navy-200 text-navy-700 hover:bg-navy-50"><Send className="h-5 w-5" /></button>
          <button onClick={() => act('save')} aria-label="Save" className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-teal-200 text-teal-600 hover:bg-teal-50"><Heart className="h-6 w-6" /></button>
        </div>
      )}
    </div>
  );
}
