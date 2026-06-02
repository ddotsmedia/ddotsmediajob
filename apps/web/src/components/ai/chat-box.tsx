'use client';

import { useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Msg = { role: 'user' | 'assistant'; content: string };

/** Reusable chat surface; `onSend` returns the assistant reply text. */
export function ChatBox({
  greeting,
  placeholder = 'Type a message…',
  onSend,
  className,
}: {
  greeting: string;
  placeholder?: string;
  onSend: (messages: Msg[]) => Promise<string>;
  className?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const reply = await onSend(next.filter((m, i) => !(i === 0 && m.role === 'assistant')));
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: 'Sorry — something went wrong. Try again.' }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }));
    }
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm',
                m.role === 'user' ? 'bg-teal-500 text-white' : 'bg-navy-100 text-navy-900',
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-navy-100 px-3.5 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 border-t p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={placeholder}
          className="h-10 flex-1 rounded-lg border border-navy-200 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <Button size="icon" onClick={send} disabled={busy}>
          <Send />
        </Button>
      </div>
    </div>
  );
}
