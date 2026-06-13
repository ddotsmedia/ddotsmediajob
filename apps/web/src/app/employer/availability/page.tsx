'use client';

import { useState } from 'react';
import { CalendarClock, Plus, Trash2, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

export default function AvailabilityPage() {
  const utils = trpc.useUtils();
  const slots = trpc.employerAts.mySlots.useQuery();
  const add = trpc.employerAts.setAvailability.useMutation({
    onSuccess: () => { utils.employerAts.mySlots.invalidate(); toast.success('Slot added'); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.employerAts.deleteSlot.useMutation({
    onSuccess: () => { utils.employerAts.mySlots.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState(45);
  const [zoom, setZoom] = useState('');

  function addSlot() {
    if (!start) { toast.error('Pick a start time'); return; }
    const s = new Date(start);
    const e = new Date(s.getTime() + duration * 60_000);
    add.mutate({ slots: [{ startTime: s.toISOString(), endTime: e.toISOString(), zoomLink: zoom || undefined }] });
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Interview availability</h1></div>
      <p className="text-navy-700/60">Add open slots. Candidates pick from these when you send a scheduling link.</p>

      <div className="mt-5 grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-[1fr_auto_1fr]">
        <div className="space-y-1.5"><Label>Start time</Label><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Duration</Label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-10 rounded-lg border px-3 text-sm">
            {[30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label>Video link (optional)</Label><Input value={zoom} onChange={(e) => setZoom(e.target.value)} placeholder="Zoom/Meet URL" /></div>
        <Button className="sm:col-span-3" onClick={addSlot} disabled={add.isPending}>{add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add slot</Button>
      </div>

      <div className="mt-6 space-y-2">
        {slots.isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-teal-500" /></div>
          : !slots.data?.length ? <p className="rounded-xl border border-dashed bg-white py-10 text-center text-navy-700/60">No upcoming slots.</p>
          : slots.data.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3">
              <div>
                <p className="font-medium text-navy-900">{new Date(s.startTime).toLocaleString('en-AE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-xs text-navy-700/50">{s.booked ? '🔒 Booked' : 'Open'}{s.zoomLink ? ' · video' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {s.zoomLink && <a href={s.zoomLink} target="_blank" rel="noopener noreferrer" className="text-teal-600"><Video className="h-4 w-4" /></a>}
                {!s.booked && <Button size="sm" variant="outline" onClick={() => del.mutate({ id: s.id })}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
