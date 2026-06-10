'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { Share2, Copy, Link2, QrCode, X, Download, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Icon({ path, fill }: { path: string; fill?: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={fill ?? 'currentColor'}>
      <path d={path} />
    </svg>
  );
}

const PLATFORMS = [
  { key: 'whatsapp', label: 'WhatsApp', color: '#25D366', path: 'M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.7.7-1 1.7-1 2.9 0 1.7 1.2 3.3 1.4 3.5.2.2 2.5 3.9 6.1 5.3 3 1.2 3.6.9 4.2.9.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', path: 'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14M8.3 18.3v-7H6v7h2.3M7.1 10.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6M18 18.3v-3.8c0-2-1.1-3-2.6-3-1.2 0-1.7.7-2 1.1v-1H11v7h2.3v-3.9c0-1 .2-2 1.4-2s1.2 1.1 1.2 2v3.9H18' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2', path: 'M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12' },
  { key: 'twitter', label: 'X', color: '#000000', path: 'M18.9 2H22l-7.3 8.3L23 22h-6.6l-5.2-6.8L5.3 22H2l7.8-8.9L1.5 2h6.8l4.7 6.2L18.9 2m-1.2 18h1.8L7.3 3.8H5.4L17.7 20' },
  { key: 'telegram', label: 'Telegram', color: '#26A5E4', path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m4.6 6.9-1.6 7.5c-.1.5-.4.7-.9.4l-2.5-1.8-1.2 1.1c-.1.1-.2.2-.5.2l.2-2.5 4.5-4.1c.2-.2 0-.3-.3-.1L8.5 13l-2.4-.8c-.5-.2-.5-.5.1-.8l9.4-3.6c.4-.2.8.1.6.9' },
];

export function ShareMenu({
  jobId,
  title,
  url,
  variant = 'icon',
}: {
  jobId: string;
  title: string;
  url: string;
  variant?: 'icon' | 'button';
}) {
  const [open, setOpen] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const link = trpc.links.forJob.useMutation();

  function toggleQr() {
    const next = !showQr;
    setShowQr(next);
    if (next) {
      QRCode.toDataURL(shareUrl, { width: 220, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
        .then(setQrDataUrl)
        .catch(() => toast.error('Could not generate QR code'));
    }
  }

  const shareUrl = shortUrl ?? url;
  const enc = encodeURIComponent;

  function openMenu() {
    setOpen(true);
    if (!shortUrl) link.mutate({ jobId }, { onSuccess: (r) => setShortUrl(r.shortUrl) });
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        /* cancelled */
      }
    } else {
      copy(shareUrl, 'Link copied');
    }
  }

  function copy(text: string, msg: string) {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  }

  const links: Record<string, string> = {
    whatsapp: `https://wa.me/?text=${enc(`${title} — ${shareUrl}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(shareUrl)}`,
    telegram: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(title)}`,
  };

  return (
    <>
      {variant === 'icon' ? (
        <Button variant="outline" size="icon" title="Share" onClick={openMenu}><Share2 /></Button>
      ) : (
        <Button variant="outline" className="w-full" onClick={openMenu}><Share2 /> Share this job</Button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-navy-900">Share this job</h3>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5 text-navy-500" /></button>
            </div>

            {/* Platform grid */}
            <div className="mt-5 grid grid-cols-5 gap-3 text-center">
              {PLATFORMS.map((p) => (
                <a key={p.key} href={links[p.key]} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ backgroundColor: p.color }}>
                    <Icon path={p.path} />
                  </span>
                  <span className="text-[11px] text-navy-700/70">{p.label}</span>
                </a>
              ))}
            </div>

            {/* Short link row */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-2 rounded-lg border bg-navy-50/40 px-3 py-2">
                <Link2 className="h-4 w-4 shrink-0 text-teal-600" />
                <span className="flex-1 truncate text-sm text-navy-700">
                  {link.isPending && !shortUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : (shortUrl ?? url)}
                </span>
                <button onClick={() => copy(shareUrl, 'Short link copied')} className="inline-flex items-center gap-1 rounded-md bg-teal-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-600">
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={nativeShare}><Share2 /> Share…</Button>
                <Button variant="outline" className="flex-1" onClick={() => copy(url, 'Full link copied')}><Copy /> Full link</Button>
                <Button variant="outline" size="icon" title="QR code" onClick={toggleQr}><QrCode /></Button>
              </div>

              {showQr && (
                <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-4">
                  {qrDataUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} alt="QR code for this job" width={200} height={200} />
                      <a href={qrDataUrl} download={`job-qr.png`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline">
                        <Download className="h-3.5 w-3.5" /> Download PNG
                      </a>
                    </>
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                  )}
                  <span className="text-xs text-navy-700/50">Scan to open the job</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
