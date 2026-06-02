'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, Mic, UserCog, Banknote, Loader2, Sparkles } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { ChatBox, type Msg } from '@/components/ai/chat-box';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'advisor', label: 'Career Advisor', icon: MessageSquare },
  { key: 'interview', label: 'Interview Prep', icon: Mic },
  { key: 'profile', label: 'Profile Coach', icon: UserCog },
  { key: 'salary', label: 'Salary Coach', icon: Banknote },
] as const;

export default function AiToolsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('advisor');

  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-teal-500" />
        <h1 className="font-display text-2xl font-bold text-navy-900">AI Career Tools</h1>
      </div>
      <p className="text-navy-700/60">Powered by Claude — tailored to the UAE market.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium',
              tab === t.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'bg-white text-navy-700 hover:bg-navy-50',
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'advisor' && <Advisor />}
        {tab === 'interview' && <Interview />}
        {tab === 'profile' && <ProfileCoach />}
        {tab === 'salary' && <SalaryCoach />}
      </div>
    </div>
  );
}

function Advisor() {
  const ask = trpc.ai.careerAdvisor.useMutation();
  return (
    <div className="h-[520px] overflow-hidden rounded-xl border bg-white">
      <ChatBox
        className="h-full"
        greeting="Hi! I'm your career advisor. Ask me about switching fields, visas, salary expectations, or your next move in the UAE."
        placeholder="Ask anything about your career…"
        onSend={async (messages: Msg[]) => (await ask.mutateAsync({ messages })).reply}
      />
    </div>
  );
}

function ResultBox({ content }: { content: string }) {
  return <div className="prose prose-slate mt-4 max-w-none whitespace-pre-wrap rounded-xl border bg-white p-6 prose-headings:font-display">{content}</div>;
}

function Interview() {
  const [role, setRole] = useState('');
  const prep = trpc.ai.interviewPrep.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="flex flex-col gap-2 rounded-xl border bg-white p-5 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label>Target role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Sales Executive" />
        </div>
        <Button onClick={() => prep.mutate({ role })} disabled={prep.isPending || role.trim().length < 2}>
          {prep.isPending ? <Loader2 className="animate-spin" /> : <Mic />} Generate prep pack
        </Button>
      </div>
      {prep.data && <ResultBox content={prep.data.content} />}
    </div>
  );
}

function ProfileCoach() {
  const coach = trpc.ai.profileCoach.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <Button onClick={() => coach.mutate()} disabled={coach.isPending}>
        {coach.isPending ? <Loader2 className="animate-spin" /> : <UserCog />} Review my profile
      </Button>
      {coach.data && <ResultBox content={coach.data.content} />}
    </div>
  );
}

function SalaryCoach() {
  const [role, setRole] = useState('');
  const [offer, setOffer] = useState('');
  const coach = trpc.ai.salaryCoach.useMutation({ onError: (e) => toast.error(e.message) });
  return (
    <div>
      <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-3 sm:items-end">
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Accountant" />
        </div>
        <div className="space-y-1.5">
          <Label>Offer (AED/mo)</Label>
          <Input type="number" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="optional" />
        </div>
        <Button
          onClick={() => coach.mutate({ role, offer: offer ? Number(offer) : undefined })}
          disabled={coach.isPending || role.trim().length < 2}
        >
          {coach.isPending ? <Loader2 className="animate-spin" /> : <Banknote />} Get advice
        </Button>
      </div>
      {coach.data && <ResultBox content={coach.data.content} />}
    </div>
  );
}
