'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Layers, Check, X } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';

export default function BulkImportPage() {
  const [text, setText] = useState('');
  const m = trpc.admin.bulkImport.useMutation({ onError: (e) => toast.error(e.message) });

  return (
    <div>
      <div className="flex items-center gap-2"><Layers className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Bulk Import</h1></div>
      <p className="text-navy-700/60">Paste multiple job messages — separate each with <code>---</code> or a blank line. Up to 20 per batch. All become DRAFTs.</p>

      <textarea
        className="mt-4 w-full rounded-xl border p-4 font-mono text-sm"
        rows={12}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Job 1 message...\n---\nJob 2 message...\n---\nJob 3 message..."}
      />
      <Button className="mt-3" onClick={() => m.mutate({ text })} disabled={m.isPending || text.trim().length < 10}>
        {m.isPending ? <Loader2 className="animate-spin" /> : <Layers />} Extract all
      </Button>

      {m.data && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-navy-900">{m.data.count} of {m.data.total} drafts created. <Link href="/admin/jobs/drafts" className="text-teal-600 hover:underline">Review drafts →</Link></p>
          <div className="space-y-2">
            {m.data.results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
                {r.ok ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-500" />}
                <span className="text-navy-900">{r.title ?? r.error ?? 'Could not extract'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
