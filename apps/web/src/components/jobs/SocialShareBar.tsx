'use client';

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';

type Props = {
  title: string;
  url: string;
  company: string;
  walkIn?: boolean;
  walkInDate?: string | null;
  walkInTimeStart?: string | null;
  walkInTimeEnd?: string | null;
  walkInVenue?: string | null;
};

const WA = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.6 5.392l-.999 3.648 3.738-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
);
const FB = (<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>);
const X = (<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>);
const LI = (<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>);

export function SocialShareBar({ title, url, company, walkIn, walkInDate, walkInTimeStart, walkInTimeEnd, walkInVenue }: Props) {
  const [copied, setCopied] = useState(false);
  const waText = walkIn
    ? `🚶 Walk-in Interview: ${title} at ${company}\n📅 ${walkInDate ?? ''} ${walkInTimeStart ?? ''}${walkInTimeEnd ? `–${walkInTimeEnd}` : ''}\n📍 ${walkInVenue ?? ''}\n🔗 ${url}`
    : `🔔 Job: ${title} at ${company} – Apply here: ${url}`;
  const enc = encodeURIComponent;

  const links: { key: string; label: string; href: string; cls: string; icon: React.ReactNode }[] = [
    { key: 'wa', label: 'WhatsApp', href: `https://wa.me/?text=${enc(waText)}`, cls: 'bg-[#25D366] text-white', icon: WA },
    { key: 'fb', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, cls: 'bg-[#1877f2] text-white', icon: FB },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`, cls: 'bg-black text-white', icon: X },
    { key: 'li', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, cls: 'bg-[#0077b5] text-white', icon: LI },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${l.label}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium active:scale-95 ${l.cls}`}
        >
          {l.icon}
          <span className="hidden sm:inline">{l.label}</span>
        </a>
      ))}
      <button
        onClick={copy}
        aria-label="Copy link"
        className="inline-flex items-center gap-1.5 rounded-full border bg-gray-100 px-3 py-2 text-sm font-medium text-navy-700 active:scale-95"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
        <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
      </button>
    </div>
  );
}
