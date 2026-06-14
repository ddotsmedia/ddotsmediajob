'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles, Check } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { VoiceRecorder } from '@/components/voice-recorder';

export function QuickImportForm() {
  const params = useSearchParams();
  const [text, setText] = useState('');
  const m = trpc.admin.bulkImport.useMutation({ onError: (e) => toast.error(e.message) });

  // Prefill from ?text= (Web Share Target / bookmarklet).
  useEffect(() => {
    const shared = params.get('text') ?? params.get('title');
    if (shared) setText(shared);
  }, [params]);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Quick Import</h1></div>
      <p className="text-navy-700/60">Paste, speak, or share a job message, then extract it into a draft.</p>

      <div className="mt-3"><VoiceRecorder onTranscript={(t) => setText((prev) => (prev ? `${prev}\n${t}` : t))} /></div>

      <textarea
        className="mt-4 w-full rounded-xl border p-4 text-base"
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste job text here…"
        autoFocus
      />
      <Button className="mt-3 w-full py-6 text-base" onClick={() => m.mutate({ text })} disabled={m.isPending || text.trim().length < 10}>
        {m.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Extract &amp; Fill
      </Button>

      {m.data && m.data.count > 0 && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <Check className="mx-auto h-8 w-8 text-green-600" />
          <p className="mt-2 font-semibold text-navy-900">{m.data.count} draft{m.data.count > 1 ? 's' : ''} created</p>
          <Link href="/admin/jobs/drafts" className="mt-2 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Review &amp; publish</Link>
        </div>
      )}
    </div>
  );
}
