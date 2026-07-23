'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { track as umamiTrack } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { ExternalWarning } from '@/components/external-warning';

const ADMIN_WA = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? '971501234567';

/** Builds the wa.me apply link and fires a fire-and-forget tracking beacon. */
export function WhatsappApplyButton({
  slug,
  title,
  company,
  applyWhatsapp,
  contactWhatsapp,
  className,
  label = 'Apply on WhatsApp',
}: {
  slug: string;
  title: string;
  company?: string | null;
  applyWhatsapp?: string | null;
  contactWhatsapp?: string | null;
  className?: string;
  label?: string;
}) {
  const number = (applyWhatsapp || contactWhatsapp || ADMIN_WA).replace(/[^\d]/g, '');
  const msg = `Hi, I am interested in the ${title} position${company ? ` at ${company}` : ''} listed on DdotsMediaJobs.com.\nReference: ddotsmediajobs.com/jobs/${slug}`;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;

  const [warn, setWarn] = useState(false);

  function track() {
    umamiTrack('apply-click', { jobId: slug, source: 'whatsapp' });
    try {
      const body = JSON.stringify({ action: 'whatsapp_apply' });
      if (navigator.sendBeacon) navigator.sendBeacon(`/api/jobs/${slug}/track`, new Blob([body], { type: 'application/json' }));
      else void fetch(`/api/jobs/${slug}/track`, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
    } catch {
      /* non-blocking */
    }
  }

  function proceed() {
    track();
    setWarn(false);
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setWarn(true)}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1da851]',
          className,
        )}
      >
        <MessageCircle className="h-4 w-4" /> {label}
      </button>
      {warn && <ExternalWarning channel="WhatsApp" onConfirm={proceed} onCancel={() => setWarn(false)} />}
    </>
  );
}
