'use client';

import { useState } from 'react';
import { Share2, Link2, X } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  title: string;
  url: string;
  waHref: string | null;
  applyHref: string;
  applyLabel?: string;
  expired?: boolean;
};

/** Sticky mobile bottom bar (<lg) — WhatsApp + Apply/Directions + Share, or expired notice. */
export function MobileApplyBar({ title, url, waHref, applyHref, applyLabel = 'Apply Now', expired }: Props) {
  const [sheet, setSheet] = useState(false);

  const wrap = 'fixed inset-x-0 z-50 border-t bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] lg:hidden';
  const pos = { bottom: 'calc(3.25rem + env(safe-area-inset-bottom))' } as const;

  if (expired) {
    return (
      <div style={pos} className={wrap}>
        <div className="flex h-16 items-center justify-center bg-red-50 px-4 text-sm font-semibold text-red-700">
          This job has expired
        </div>
      </div>
    );
  }

  const waShare = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
  const liShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Copy failed');
    }
    setSheet(false);
  }

  return (
    <>
      <div style={pos} className={wrap}>
        <div className="flex h-16 items-center gap-2 px-4 py-2">
          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] py-3 text-sm font-semibold text-white active:scale-95">
              💬 WhatsApp
            </a>
          ) : (
            <a href="#apply" className="flex flex-1 items-center justify-center rounded-lg bg-[#25D366] py-3 text-sm font-semibold text-white active:scale-95">
              💬 WhatsApp
            </a>
          )}
          <a href={applyHref} {...(applyHref.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="flex flex-1 items-center justify-center rounded-lg bg-[#E8622A] py-3 text-sm font-semibold text-white active:scale-95">
            {applyLabel}
          </a>
          <button onClick={() => setSheet(true)} aria-label="Share" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-navy-700 active:scale-95">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-base font-bold text-navy-900">Share this job</p>
              <button onClick={() => setSheet(false)} aria-label="Close"><X className="h-5 w-5 text-navy-700/60" /></button>
            </div>
            <div className="space-y-2">
              <button onClick={copyLink} className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-navy-800 active:bg-navy-50">
                <Link2 className="h-5 w-5 text-teal-600" /> Copy link
              </button>
              <a href={waShare} target="_blank" rel="noopener noreferrer" onClick={() => setSheet(false)} className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-navy-800 active:bg-navy-50">
                <span className="text-lg">💬</span> Share on WhatsApp
              </a>
              <a href={liShare} target="_blank" rel="noopener noreferrer" onClick={() => setSheet(false)} className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium text-navy-800 active:bg-navy-50">
                <span className="text-lg">🔗</span> Share on LinkedIn
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
