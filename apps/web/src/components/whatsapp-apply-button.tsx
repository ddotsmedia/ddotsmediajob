'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { track as umamiTrack } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { trpc } from '@/trpc/react';
import { ExternalWarning } from '@/components/external-warning';

// Real DdotsMediaJobs WhatsApp — never a placeholder (audit: fake 971501234567 removed).
const ADMIN_WA = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? '971509379212';

/** Builds the wa.me apply link and fires a fire-and-forget tracking beacon. */
export function WhatsappApplyButton({
  slug,
  jobId,
  title,
  company,
  applyWhatsapp,
  contactWhatsapp,
  className,
  label = 'Apply on WhatsApp',
  sourcePage = 'job_detail',
}: {
  slug: string;
  jobId?: string;
  title: string;
  company?: string | null;
  applyWhatsapp?: string | null;
  contactWhatsapp?: string | null;
  className?: string;
  label?: string;
  sourcePage?: 'job_detail' | 'search' | 'email' | 'push';
}) {
  const recordCta = trpc.jobs.recordCtaClick.useMutation();
  const number = (applyWhatsapp || contactWhatsapp || ADMIN_WA).replace(/[^\d]/g, '');
  const msg = `Hi, I am interested in the ${title} position${company ? ` at ${company}` : ''} listed on DdotsMediaJobs.com.\nReference: ddotsmediajobs.com/jobs/${slug}`;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;

  const [warn, setWarn] = useState(false);

  // Umami analytics only — the cta_clicks row is recorded via recordCta below (no beacon,
  // avoids double-counting now that the beacon route also writes cta_clicks).
  function track() {
    umamiTrack('apply-click', { jobId: slug, source: 'whatsapp' });
  }

  function proceed() {
    track();
    if (jobId) recordCta.mutate({ jobId, ctaType: 'whatsapp', sourcePage });
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
