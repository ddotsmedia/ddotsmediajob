'use client';

import { useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/** Hold-to-record voice → Deepgram transcript. Calls onTranscript(text). Max 60s. */
export function VoiceRecorder({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function start() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) { toast.error('Microphone not available on this browser.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setState('transcribing');
        try {
          const res = await fetch('/api/voice/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/webm' }, body: blob });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Failed');
          if (json.transcript) onTranscript(json.transcript);
          else toast.error('No speech detected.');
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Transcription failed');
        } finally {
          setState('idle');
        }
      };
      recorderRef.current = mr;
      mr.start();
      setState('recording');
      stopTimer.current = setTimeout(() => stop(), 60_000); // auto-stop at 60s
    } catch {
      toast.error('Microphone access denied.');
    }
  }
  function stop() {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    recorderRef.current?.state === 'recording' && recorderRef.current.stop();
  }

  return (
    <button
      type="button"
      onClick={state === 'recording' ? stop : start}
      disabled={state === 'transcribing'}
      className={cn('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold', state === 'recording' ? 'bg-red-500 text-white' : 'bg-navy-900 text-white hover:bg-navy-800')}
    >
      {state === 'transcribing' ? <Loader2 className="h-4 w-4 animate-spin" /> : state === 'recording' ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
      {state === 'transcribing' ? 'Transcribing…' : state === 'recording' ? 'Stop' : 'Voice input'}
    </button>
  );
}
