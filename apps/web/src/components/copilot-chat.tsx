'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import type { useCopilotChat } from '@/lib/use-copilot-chat';

/** Message list + input, driven by a useCopilotChat() instance. */
export function CopilotChat({ chat }: { chat: ReturnType<typeof useCopilotChat> }) {
  const { messages, sendMessage, loading, error, context } = chat;
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  function submit() {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    void sendMessage(t);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-2 text-xs text-navy-700/60">Giving advice as <span className="font-semibold capitalize text-teal-700">{context}</span></div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center text-center text-navy-700/50">
            <Sparkles className="h-8 w-8 text-teal-400" />
            <p className="mt-2 text-sm">Ask me about salaries, CVs, job matching, or career tips…</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-navy-100 text-navy-900'}`}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start"><div className="inline-flex items-center gap-1.5 rounded-2xl bg-navy-100 px-3 py-2 text-sm text-navy-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</div></div>
        )}
        {error && <p className="text-center text-xs text-red-600">Sorry, couldn&apos;t reach the assistant. Try again?</p>}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          rows={1}
          placeholder="Type a message…"
          className="max-h-32 flex-1 resize-none rounded-xl border border-navy-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
          aria-label="Message"
        />
        <button onClick={submit} disabled={loading || !draft.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
