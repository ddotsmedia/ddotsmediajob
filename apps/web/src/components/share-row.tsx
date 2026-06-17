'use client';

import { MessageCircle, Link2, Linkedin } from 'lucide-react';
import { toast } from 'sonner';

/** Compact inline share row: WhatsApp · Copy link · LinkedIn. */
export function ShareRow({ url, title }: { url: string; title: string }) {
  const text = `${title} — ${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  function copy() {
    void navigator.clipboard?.writeText(url).then(() => toast.success('Link copied')).catch(() => toast.error('Copy failed'));
  }

  const cls = 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors';
  return (
    <div className="flex gap-2">
      <a href={wa} target="_blank" rel="noopener noreferrer" className={`${cls} border-[#25D366]/30 text-[#1a8a4d] hover:bg-[#25D366]/10`}>
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
      <button type="button" onClick={copy} className={`${cls} border-navy-200 text-navy-700 hover:bg-navy-50`}>
        <Link2 className="h-4 w-4" /> Copy
      </button>
      <a href={li} target="_blank" rel="noopener noreferrer" className={`${cls} border-[#0a66c2]/30 text-[#0a66c2] hover:bg-[#0a66c2]/10`}>
        <Linkedin className="h-4 w-4" /> LinkedIn
      </a>
    </div>
  );
}
