'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, Loader2, Plus, Trash2, X, Video } from 'lucide-react';
import { EMIRATES } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Input, Label, Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

const fmtDate = (d: string | Date) => new Intl.DateTimeFormat('en-AE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dubai' }).format(new Date(d));

export default function EmployerEventsPage() {
  const utils = trpc.useUtils();
  const mine = trpc.events.mine.useQuery();
  const inval = () => utils.events.mine.invalidate();
  const create = trpc.events.create.useMutation({ onSuccess: () => { inval(); toast.success('Event created'); reset(); } });
  const toggle = trpc.events.togglePublish.useMutation({ onSuccess: inval });
  const remove = trpc.events.remove.useMutation({ onSuccess: () => { inval(); toast.success('Deleted'); } });

  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emirate, setEmirate] = useState('');
  const [rolesText, setRolesText] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');

  function reset() { setShow(false); setTitle(''); setDescription(''); setEmirate(''); setRolesText(''); setStartsAt(''); setDurationMin('60'); setMeetingUrl(''); setMaxAttendees(''); }

  function submit() {
    if (title.trim().length < 2 || !startsAt) { toast.error('Title and date/time are required'); return; }
    create.mutate({
      title, description: description || undefined, emirate: emirate || undefined, rolesText: rolesText || undefined,
      startsAt: new Date(startsAt), durationMin: Number(durationMin) || 60,
      meetingUrl: meetingUrl || undefined, maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
      isPublished: true,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Hiring Events</h1></div>
        <Button onClick={() => setShow((s) => !s)}>{show ? <X /> : <Plus />} {show ? 'Cancel' : 'New event'}</Button>
      </div>

      {show && (
        <div className="mt-6 space-y-3 rounded-xl border bg-white p-5">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Open Day — Sales Roles" /></div>
          <div className="space-y-1.5"><Label>Description</Label><textarea className="w-full rounded-lg border p-3" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Emirate</Label><Select value={emirate} onChange={(e) => setEmirate(e.target.value)}><option value="">Any / online</option>{EMIRATES.map((em) => <option key={em.slug} value={em.name}>{em.name}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>Roles (comma separated)</Label><Input value={rolesText} onChange={(e) => setRolesText(e.target.value)} placeholder="Sales, Admin" /></div>
            <div className="space-y-1.5"><Label>Date &amp; time</Label><Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Duration (min)</Label><Input type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Meeting link (Zoom/Meet)</Label><Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://…" /></div>
            <div className="space-y-1.5"><Label>Max attendees (optional)</Label><Input type="number" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value)} /></div>
          </div>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending ? <Loader2 className="animate-spin" /> : null} Create &amp; publish</Button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {mine.isLoading ? <Loader2 className="animate-spin text-teal-500" /> : mine.data && mine.data.length > 0 ? (
          mine.data.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div>
                <p className="font-semibold text-navy-900">{e.title}</p>
                <p className="text-sm text-navy-700/60">{fmtDate(e.startsAt)} · {e.durationMin} min{e.emirate ? ` · ${e.emirate}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {e.meetingUrl && <a href={e.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline"><Video className="h-4 w-4" /> Link</a>}
                <label className="flex items-center gap-1 text-sm text-navy-700/70"><input type="checkbox" checked={e.isPublished} onChange={(ev) => toggle.mutate({ id: e.id, isPublished: ev.target.checked })} /> Published</label>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${e.title}"?`)) remove.mutate({ id: e.id }); }}><Trash2 className="text-red-500" /></Button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border bg-white p-10 text-center text-navy-700/60">No events yet. Create one to start hiring live.</p>
        )}
      </div>
    </div>
  );
}
