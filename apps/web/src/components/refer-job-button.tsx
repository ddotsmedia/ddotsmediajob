'use client';

import { useState } from 'react';
import { Share2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ddotsmediajobs.com';

/** "Know someone perfect?" — opens WhatsApp with a pre-filled referral message. */
export function ReferJobButton({ title, slug, salary, emirate, company }: { title: string; slug: string; salary: string; emirate: string; company?: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  const link = `${SITE}/jobs/${slug}`;
  const msg = `Hi ${name || 'there'}, I thought you'd be perfect for ${title}${company ? ` at ${company}` : ''} in ${emirate}. ${salary}. Check it out and apply free: ${link}`;
  const to = number.replace(/[^\d]/g, '');
  const waHref = `https://wa.me/${to}?text=${encodeURIComponent(msg)}`;

  if (!open) {
    return <Button variant="outline" className="w-full" onClick={() => setOpen(true)}><Share2 className="h-4 w-4" /> Know someone perfect?</Button>;
  }
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm font-semibold text-navy-900">Refer a friend to this job</p>
      <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Friend's name (optional)" />
      <Input className="mt-2" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Friend's WhatsApp e.g. 9715xxxxxxxx" />
      <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"><MessageCircle className="h-4 w-4" /> Send via WhatsApp</a>
    </div>
  );
}
