'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Send, Loader2, MessageSquare, Lock, ArrowLeft } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MessagesView() {
  const params = useSearchParams();
  const initialTo = params.get('to');
  const utils = trpc.useUtils();
  const conversations = trpc.messages.conversations.useQuery();
  const [selected, setSelected] = useState<string | null>(initialTo);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const thread = trpc.messages.thread.useQuery({ withUserId: selected ?? '' }, { enabled: !!selected });
  const send = trpc.messages.send.useMutation({
    onSuccess: () => {
      setDraft('');
      utils.messages.thread.invalidate();
      utils.messages.conversations.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread.data?.messages.length]);

  function submit() {
    if (!selected || draft.trim().length === 0) return;
    send.mutate({ toUserId: selected, body: draft.trim() });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Messages</h1></div>

      <div className="grid h-[600px] grid-cols-1 overflow-hidden rounded-xl border bg-white md:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <div className={cn('border-r overflow-y-auto', selected ? 'hidden md:block' : 'block')}>
          {conversations.isLoading ? <Loader2 className="m-4 animate-spin text-teal-500" /> : conversations.data && conversations.data.length > 0 ? (
            conversations.data.map((c) => (
              <button key={c.otherId} onClick={() => setSelected(c.otherId)}
                className={cn('flex w-full items-start gap-3 border-b px-4 py-3 text-left hover:bg-navy-50', selected === c.otherId && 'bg-teal-50')}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{c.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between"><span className="truncate font-medium text-navy-900">{c.name}</span>{c.unread > 0 && <span className="ml-2 rounded-full bg-teal-600 px-2 text-xs font-bold text-white">{c.unread}</span>}</span>
                  <span className="block truncate text-sm text-navy-700/60">{c.lastBody}</span>
                </span>
              </button>
            ))
          ) : (
            <p className="p-6 text-center text-sm text-navy-700/60">No conversations yet. They unlock when an employer shortlists a candidate.</p>
          )}
        </div>

        {/* Thread */}
        <div className={cn('flex flex-col', !selected ? 'hidden md:flex' : 'flex')}>
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-navy-700/50">Select a conversation</div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <button className="md:hidden" onClick={() => setSelected(null)}><ArrowLeft className="h-5 w-5 text-navy-700" /></button>
                <span className="font-semibold text-navy-900">{thread.data?.otherName ?? '…'}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {thread.isLoading ? <Loader2 className="animate-spin text-teal-500" /> : thread.data?.messages.length ? (
                  thread.data.messages.map((m) => (
                    <div key={m.id} className={cn('max-w-[75%] rounded-2xl px-4 py-2 text-sm', m.mine ? 'ml-auto bg-teal-600 text-white' : 'bg-navy-100 text-navy-900')}>{m.body}</div>
                  ))
                ) : (
                  <p className="text-center text-sm text-navy-700/50">No messages yet. Say hello.</p>
                )}
                <div ref={endRef} />
              </div>
              {thread.data && !thread.data.unlocked ? (
                <div className="flex items-center gap-2 border-t bg-navy-50 px-4 py-3 text-sm text-navy-700/70"><Lock className="h-4 w-4" /> Messaging unlocks once shortlisted.</div>
              ) : (
                <div className="flex items-center gap-2 border-t p-3">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                    placeholder="Type a message…" className="flex-1 rounded-lg border px-3 py-2" />
                  <Button onClick={submit} disabled={send.isPending || draft.trim().length === 0}>{send.isPending ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
