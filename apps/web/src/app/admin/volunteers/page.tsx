'use client';

import { useState } from 'react';
import { HandHeart, Loader2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';

export default function AdminVolunteersPage() {
  const utils = trpc.useUtils();
  const list = trpc.communityHub.adminListVolunteers.useQuery();
  const assign = trpc.communityHub.adminAssignVolunteer.useMutation({
    onSuccess: () => { utils.communityHub.adminListVolunteers.invalidate(); toast.success('Updated'); },
    onError: (e) => toast.error(e.message),
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [userId, setUserId] = useState('');

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2"><HandHeart className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Volunteers</h1></div>
      <p className="text-navy-700/60">Assign a volunteer (by user ID) to each WhatsApp group.</p>

      <div className="mt-5 space-y-2">
        {list.isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-500" /></div>
          : list.data?.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div>
                <p className="font-semibold text-navy-900">{g.name}</p>
                <p className="text-xs text-navy-700/60">{g.volunteerName ? `Volunteer: ${g.volunteerName}` : 'No volunteer'} · {g.jobsShared} shared</p>
              </div>
              {editing === g.id ? (
                <div className="flex gap-2">
                  <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user UUID" className="w-56" />
                  <Button size="sm" onClick={() => { assign.mutate({ groupId: g.id, userId: userId || null }); setEditing(null); setUserId(''); }} disabled={assign.isPending}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(g.id); setUserId(g.volunteerId ?? ''); }}><UserPlus className="h-4 w-4" /> Assign</Button>
                  {g.volunteerId && <Button size="sm" variant="ghost" onClick={() => assign.mutate({ groupId: g.id, userId: null })}>Remove</Button>}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
