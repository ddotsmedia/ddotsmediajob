'use client';

import { trpc } from '@/trpc/react';
import { ChatBox, type Msg } from '@/components/ai/chat-box';

const SUGGESTIONS = [
  'How do I find jobs in Dubai?',
  'What salary can I expect as an accountant?',
  'How to write a UAE CV?',
  'What is the golden visa and do I qualify?',
];

export function CareerAdvisorChat() {
  const ask = trpc.ai.careerAdvisor.useMutation();
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <span key={s} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs text-teal-700">{s}</span>
        ))}
      </div>
      <div className="h-[560px] overflow-hidden rounded-xl border bg-white">
        <ChatBox
          className="h-full"
          greeting="Hi! I'm your UAE career advisor. Ask me about jobs, visas, salaries, CVs, or your next career move — try one of the suggestions above."
          placeholder="Ask anything about working in the UAE…"
          onSend={async (messages: Msg[]) => (await ask.mutateAsync({ messages })).reply}
        />
      </div>
    </div>
  );
}
