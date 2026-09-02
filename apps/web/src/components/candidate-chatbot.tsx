'use client';

import { useRef, useState } from 'react';
import { MessageCircle, Send, Loader2, Sparkles } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

type Turn = { role: 'user' | 'assistant'; content: string };

/** Mirrors the server cap — keeps the request inside what the API accepts. */
const MAX_HISTORY = 20;
const MAX_MESSAGE = 1000;

const SUGGESTIONS = [
  'Is visa sponsorship included?',
  'What experience is required?',
  'What are the working hours?',
];

/**
 * Ask-about-this-job widget.
 *
 * Stateless: the transcript lives in this component only — nothing is sent
 * anywhere but the question itself, and no phone number is collected. It
 * answers questions; applying and interview scheduling stay with the existing
 * apply flow, so nothing here can imply an interview was booked.
 */
export function CandidateChatbot({ jobId }: { jobId: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const send = trpc.chatbot.sendMessage.useMutation();

  async function ask(question: string) {
    const q = question.trim();
    if (!q || send.isPending) return;

    setError(null);
    setInput('');
    // Only the last N turns are sent; the server rejects more than MAX_HISTORY.
    const history = [...turns, { role: 'user' as const, content: q }].slice(-MAX_HISTORY);
    setTurns(history);
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));

    try {
      const res = await send.mutateAsync({
        jobId,
        message: q,
        history: turns.slice(-(MAX_HISTORY - 1)),
      });
      setTurns((t) => [...t, { role: 'assistant', content: res.message }]);
    } catch (e) {
      // Show the server's reason (rate limit, blocked, not found) rather than a
      // generic failure — "try again in 42 minutes" is actionable.
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    }
  }

  return (
    <section className="rounded-xl border bg-white p-4" aria-labelledby="job-chat-title">
      <h2 id="job-chat-title" className="flex items-center gap-2 font-display text-sm font-bold text-navy-900">
        <MessageCircle className="h-4 w-4 text-teal-600" /> Ask about this job
      </h2>
      <p className="mt-1 text-xs text-navy-700/60">
        Answers come from this listing only. To apply or arrange an interview, use the Apply button.
      </p>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        className="mt-3 max-h-80 min-h-[6rem] overflow-y-auto rounded-lg bg-navy-50/60 p-3"
      >
        {turns.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-navy-700/50">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="block w-full rounded-lg border bg-white px-3 py-2 text-left text-sm text-navy-800 hover:border-teal-300 hover:text-teal-700"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          turns.map((t, i) => (
            <div
              key={i}
              className={`mb-2 max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                t.role === 'user'
                  ? 'ml-auto bg-teal-600 text-white'
                  : 'bg-white text-navy-800 ring-1 ring-navy-100'
              }`}
            >
              {t.content}
            </div>
          ))
        )}
        {send.isPending && (
          <div className="flex items-center gap-2 text-xs text-navy-700/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-500" /> Thinking…
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <input
          type="text"
          value={input}
          maxLength={MAX_MESSAGE}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about salary, visa, experience…"
          aria-label="Ask a question about this job"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <Button type="submit" disabled={!input.trim() || send.isPending} aria-label="Send question">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-2 flex items-center gap-1 text-[11px] text-navy-700/40">
        <Sparkles className="h-3 w-3" /> AI-generated — confirm details with the employer before applying.
      </p>
    </section>
  );
}
