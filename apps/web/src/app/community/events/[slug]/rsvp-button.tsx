'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Video } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

export function RsvpButton({ eventId, slug, initialRsvp, zoomLink }: { eventId: string; slug: string; initialRsvp: boolean; zoomLink: string | null }) {
  const { status } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [done, setDone] = useState(initialRsvp);
  const rsvp = trpc.communityHub.rsvpEvent.useMutation({
    onSuccess: () => { setDone(true); utils.communityHub.eventBySlug.invalidate({ slug }); toast.success('You are registered!'); },
    onError: (e) => toast.error(e.message),
  });

  if (done) {
    return (
      <div className="rounded-xl bg-green-50 p-4 text-green-800">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /> You&apos;re registered</p>
        {zoomLink && <a href={zoomLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"><Video className="h-4 w-4" /> Join link</a>}
      </div>
    );
  }
  return (
    <Button onClick={() => { if (status !== 'authenticated') { router.push('/login'); return; } rsvp.mutate({ eventId }); }} disabled={rsvp.isPending}>
      {rsvp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} RSVP — get the join link
    </Button>
  );
}
