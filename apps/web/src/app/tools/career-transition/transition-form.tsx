'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Input, Label } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

export function TransitionForm() {
  const [fromRole, setFromRole] = useState('');
  const [toRole, setToRole] = useState('');
  const [months, setMonths] = useState('6');
  const m = trpc.ai.careerTransitionPlanPublic.useMutation({ onError: (e) => toast.error(e.message) });

  return (
    <div>
      <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-3 sm:items-end">
        <div className="space-y-1.5"><Label>Current role</Label><Input value={fromRole} onChange={(e) => setFromRole(e.target.value)} placeholder="e.g. Teacher" /></div>
        <div className="space-y-1.5"><Label>Target role</Label><Input value={toRole} onChange={(e) => setToRole(e.target.value)} placeholder="e.g. Instructional Designer" /></div>
        <div className="space-y-1.5"><Label>Timeline (months)</Label><Input type="number" value={months} onChange={(e) => setMonths(e.target.value)} /></div>
      </div>
      <Button className="mt-3" onClick={() => m.mutate({ fromRole, toRole, months: Number(months) || 6 })} disabled={m.isPending || fromRole.trim().length < 2 || toRole.trim().length < 2}>
        {m.isPending ? <Loader2 className="animate-spin" /> : <ArrowRightLeft />} Build my plan
      </Button>
      {m.data && <div className="prose prose-slate mt-4 max-w-none whitespace-pre-wrap rounded-xl border bg-white p-6 prose-headings:font-display">{m.data.content}</div>}
    </div>
  );
}
