'use client';

import { useState } from 'react';
import { GraduationCap, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Badge } from '@/components/ui/primitives';

export default function MentorshipPage() {
  const utils = trpc.useUtils();
  const reqs = trpc.communityHub.myMentorRequests.useQuery();
  const respond = trpc.communityHub.respondMentorRequest.useMutation({
    onSuccess: () => { utils.communityHub.myMentorRequests.invalidate(); toast.success('Updated'); },
    onError: (e) => toast.error(e.message),
  });
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [zoom, setZoom] = useState('');

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Mentorship requests</h1></div>

      <div className="mt-5 space-y-3">
        {reqs.isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-500" /></div>
          : !reqs.data?.length ? <p className="rounded-xl border border-dashed bg-white py-12 text-center text-navy-700/60">No requests yet.</p>
          : reqs.data.map((r) => (
            <div key={r.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-navy-900">{r.topic}</p>
                <Badge variant={r.status === 'accepted' ? 'success' : r.status === 'declined' ? 'urgent' : r.status === 'completed' ? 'muted' : 'outline'} className="capitalize">{r.status}</Badge>
              </div>
              {r.message && <p className="mt-1 text-sm text-navy-700/70">{r.message}</p>}
              {r.preferredTime && <p className="mt-1 text-xs text-navy-700/50">Preferred: {r.preferredTime}</p>}
              {r.status === 'pending' && (
                linkFor === r.id ? (
                  <div className="mt-3 flex gap-2"><Input value={zoom} onChange={(e) => setZoom(e.target.value)} placeholder="Meeting link (optional)" /><Button size="sm" onClick={() => { respond.mutate({ id: r.id, status: 'accepted', zoomLink: zoom || undefined }); setLinkFor(null); setZoom(''); }}>Accept</Button></div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => { setLinkFor(r.id); setZoom(''); }}><Check className="h-4 w-4" /> Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => respond.mutate({ id: r.id, status: 'declined' })}><X className="h-4 w-4" /> Decline</Button>
                  </div>
                )
              )}
              {r.status === 'accepted' && <Button className="mt-3" size="sm" variant="outline" onClick={() => respond.mutate({ id: r.id, status: 'completed' })}>Mark completed</Button>}
            </div>
          ))}
      </div>
    </div>
  );
}
