'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Share2, Loader2, Copy, X } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'twitter', label: 'X / Twitter' },
] as const;

export function SocialShare({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const gen = trpc.ai.socialPosts.useMutation({ onError: (e) => toast.error(e.message) });

  return (
    <>
      <Button variant="ghost" size="icon" title="AI social posts" onClick={() => { setOpen(true); if (!gen.data) gen.mutate({ jobId }); }}>
        <Share2 />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-navy-900">AI Social Posts</h3>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5 text-navy-500" /></button>
            </div>
            {gen.isPending && <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-500" /></div>}
            {gen.data && (
              <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto">
                {PLATFORMS.map((p) => (
                  <div key={p.key} className="rounded-lg border bg-navy-50/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-navy-900">{p.label}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(gen.data![p.key]); toast.success(`${p.label} post copied`); }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-navy-700/80">{gen.data![p.key]}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
