'use client';

import { useState } from 'react';
import { Bot, X } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { ChatBox, type Msg } from './chat-box';

/** Floating HR assistant for employers (Haiku/Sonnet routed server-side). */
export function HrChatbot() {
  const [open, setOpen] = useState(false);
  const ask = trpc.ai.hrChatbot.useMutation();

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg transition-transform hover:scale-105"
        aria-label="HR assistant"
      >
        {open ? <X /> : <Bot />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[460px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
          <div className="flex items-center gap-2 bg-navy-900 px-4 py-3 text-white">
            <Bot className="h-5 w-5 text-teal-400" />
            <div>
              <p className="text-sm font-bold">HR Assistant</p>
              <p className="text-xs text-navy-100/60">Hiring & UAE labour basics</p>
            </div>
          </div>
          <ChatBox
            className="flex-1"
            greeting="Hi! I can help with posting jobs, screening, and UAE hiring questions. What do you need?"
            placeholder="Ask about hiring…"
            onSend={async (messages: Msg[]) => (await ask.mutateAsync({ messages })).reply}
          />
        </div>
      )}
    </>
  );
}
