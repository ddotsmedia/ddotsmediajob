'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Lightbulb, X } from 'lucide-react';
import { useFeatureFlag } from '@/context/FeatureFlagsContext';
import { useCopilotChat } from '@/lib/use-copilot-chat';
import { CopilotChat } from '@/components/copilot-chat';

/** Floating Career Copilot — only shown when the ai_copilot flag is on and the user is signed in. */
export function CopilotWidget() {
  const { data: session } = useSession();
  const { enabled } = useFeatureFlag('ai_copilot');
  const [open, setOpen] = useState(false);
  const chat = useCopilotChat();

  if (!enabled || !session?.user) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[90] inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-teal-700"
          aria-label="Open Career Copilot"
        >
          <Lightbulb className="h-5 w-5" /> Career Copilot
        </button>
      )}
      {open && (
        <div className="fixed bottom-0 right-0 z-[95] flex h-[80vh] w-full flex-col rounded-t-2xl border bg-white shadow-2xl sm:bottom-4 sm:right-4 sm:h-[560px] sm:w-96 sm:rounded-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="inline-flex items-center gap-2 font-display font-bold text-navy-900"><Lightbulb className="h-5 w-5 text-teal-500" /> Career Copilot</span>
            <div className="flex items-center gap-2">
              <button onClick={chat.newChat} className="text-xs font-medium text-navy-700/60 hover:text-teal-600">New</button>
              <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5 text-navy-400" /></button>
            </div>
          </div>
          <div className="min-h-0 flex-1"><CopilotChat chat={chat} /></div>
        </div>
      )}
    </>
  );
}
