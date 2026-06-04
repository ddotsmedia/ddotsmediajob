'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Mic, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';

export function InterviewPrepTool() {
  const [role, setRole] = useState('');
  const prep = trpc.ai.interviewPrep.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="flex flex-col gap-2 rounded-xl border bg-white p-5 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label>Target role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Sales Executive, Staff Nurse, Accountant" />
        </div>
        <Button onClick={() => prep.mutate({ role })} disabled={prep.isPending || role.trim().length < 2}>
          {prep.isPending ? <Loader2 className="animate-spin" /> : <Mic />} Generate prep pack
        </Button>
      </div>
      {prep.data && (
        <div className="prose prose-slate mt-4 max-w-none whitespace-pre-wrap rounded-xl border bg-white p-6 prose-headings:font-display">
          {prep.data.content}
        </div>
      )}
    </div>
  );
}
