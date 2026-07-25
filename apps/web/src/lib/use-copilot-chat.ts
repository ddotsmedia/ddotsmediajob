'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { trpc } from '@/trpc/react';

export type CopilotMsg = { role: 'user' | 'assistant'; content: string };
const LS_KEY = 'ddots-copilot-conv';

/** Shared Copilot chat state — used by both the floating widget and the full-page view. */
export function useCopilotChat() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const context: 'jobseeker' | 'employer' | 'admin' = role === 'employer' ? 'employer' : role === 'admin' ? 'admin' : 'jobseeker';

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotMsg[]>([]);
  const [error, setError] = useState(false);
  const send = trpc.copilot.sendMessage.useMutation();

  // Restore the last conversation id.
  useEffect(() => {
    try { const s = localStorage.getItem(LS_KEY); if (s) setConversationId(s); } catch { /* ignore */ }
  }, []);

  // Load the selected conversation's messages.
  const conv = trpc.copilot.getConversation.useQuery({ conversationId: conversationId! }, { enabled: !!conversationId, retry: false });
  useEffect(() => {
    if (conv.data?.messages) setMessages(conv.data.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })));
  }, [conv.data]);

  const sendMessage = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || send.isPending) return;
    setError(false);
    setMessages((m) => [...m, { role: 'user', content: t }]);
    try {
      const r = await send.mutateAsync({ conversationId: conversationId ?? undefined, userMessage: t, context });
      setMessages((m) => [...m, { role: 'assistant', content: r.assistantMessage }]);
      if (!conversationId) {
        setConversationId(r.conversationId);
        try { localStorage.setItem(LS_KEY, r.conversationId); } catch { /* ignore */ }
      }
    } catch {
      setError(true);
    }
  }, [conversationId, context, send]);

  const newChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(false);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }, []);

  const selectConversation = useCallback((id: string) => {
    setConversationId(id);
    setError(false);
    try { localStorage.setItem(LS_KEY, id); } catch { /* ignore */ }
  }, []);

  return { messages, sendMessage, newChat, selectConversation, conversationId, loading: send.isPending, error, context };
}
