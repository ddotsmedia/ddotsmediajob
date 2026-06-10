'use client';

import { useState } from 'react';
import { Handshake } from 'lucide-react';
import { ChatBox, type Msg } from '@/components/ai/chat-box';
import { Input, Label } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { trpc } from '@/trpc/react';

export function NegotiationSim() {
  const [role, setRole] = useState('');
  const [started, setStarted] = useState(false);
  const m = trpc.ai.negotiationSimulatorPublic.useMutation();

  if (!started) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border bg-white p-5 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5"><Label>Role you&apos;re negotiating for</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer" /></div>
        <Button onClick={() => setStarted(true)} disabled={role.trim().length < 2}><Handshake className="h-4 w-4" /> Start roleplay</Button>
      </div>
    );
  }
  return (
    <div className="h-[520px] overflow-hidden rounded-xl border bg-white">
      <ChatBox
        className="h-full"
        greeting={`You're negotiating salary for a ${role} role. Make your opening ask — I'll play the hiring manager and coach you after each reply.`}
        placeholder="Make your offer or counter…"
        onSend={async (messages: Msg[]) => (await m.mutateAsync({ role, messages })).reply}
      />
    </div>
  );
}
