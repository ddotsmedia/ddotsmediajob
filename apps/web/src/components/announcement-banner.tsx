'use client';

import Link from 'next/link';
import { trpc } from '@/trpc/react';

/** Site-wide announcement banner, admin-controlled via site_settings (announcement_banner). */
export function AnnouncementBanner() {
  const { data } = trpc.content.announcement.useQuery(undefined, { staleTime: 60_000 });
  if (!data) return null;

  const content = <span className="font-medium">{data.text}</span>;
  return (
    <div className="bg-teal-600 text-center text-sm text-white">
      <div className="mx-auto max-w-7xl px-4 py-2">
        {data.link ? (
          <Link href={data.link} className="hover:underline">
            {content} →
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
