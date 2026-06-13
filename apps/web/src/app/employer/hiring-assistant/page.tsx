'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Input } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'Which of my jobs has the most applications?',
  'Draft a rejection email that keeps the CV for future roles',
  'What should I do about a job with no applications?',
];

export default function HiringAssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: "Hi! I'm your hiring assistant. Ask me about your jobs, applications, or to draft messages." }]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const ask = trpc.employerAts.hiringAssistant.useMutation({
    onSuccess: (r) => setMessages((m) => [...m, { role: 'assistant', content: r.reply }]),
    onError: (e) => { toast.error(e.message); setMessages((m) => m.slice(0, -1)); },
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function send(text: string) {
    const t = text.trim();
    if (!t || ask.isPending) return;
    const next: Msg[] = [...messages, { role: 'user', content: t }];
    setMessages(next);
    setInput('');
    ask.mutate({ messages: next.filter((m) => m.role !== 'assistant' || m.content.length < 3500).slice(-12) });
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] max-w-3xl flex-col">
      <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Hiring Assistant</h1></div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-xl border bg-white p-4">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}>
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', m.role === 'user' ? 'bg-navy-900 text-white' : 'bg-teal-100 text-teal-700')}>{m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</span>
            <div className={cn('max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm', m.role === 'user' ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-800')}>{m.content}</div>
          </div>
        ))}
        {ask.isPending && <div className="flex gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700"><Bot className="h-4 w-4" /></span><div className="rounded-2xl bg-navy-50 px-4 py-2"><Loader2 className="h-4 w-4 animate-spin text-teal-500" /></div></div>}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full bg-navy-50 px-3 py-1.5 text-xs text-navy-700 hover:bg-navy-100">{s}</button>)}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(input)} placeholder="Ask about your hiring…" />
        <Button onClick={() => send(input)} disabled={ask.isPending || !input.trim()}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
