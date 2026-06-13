'use client';

import { useState } from 'react';
import { Palette, Copy, Download, Loader2 } from 'lucide-react';
import { categoryBySlug } from '@ddots/shared';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/primitives';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ddotsmediajobs.com';

export default function BrandKitPage() {
  const groups = trpc.communityHub.getGroups.useQuery();
  const [id, setId] = useState('');
  const g = groups.data?.find((x) => x.id === id);

  const cover = g ? `${SITE}/api/og/group-cover?name=${encodeURIComponent(g.name)}&members=${g.memberCount}&category=${encodeURIComponent(g.categorySlug ? categoryBySlug(g.categorySlug)?.name ?? '' : '')}` : '';
  const pinned = g ? `👋 Welcome to ${g.name}!\n📌 Group rules: Jobs only. No spam. Be respectful.\n🔍 Browse jobs: ${SITE}/whatsapp-groups/${g.slug}\n🔔 Set job alerts: ${SITE}/dashboard/alerts\n📝 Post your CV: ${SITE}/register\n🤝 Powered by DdotsMediaJobs` : '';

  function copy(t: string) { navigator.clipboard.writeText(t).then(() => toast.success('Copied')).catch(() => toast.error('Copy failed')); }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">Group brand kit</h1></div>
      <p className="text-navy-700/60">Generate cover images and copy-paste templates for each WhatsApp group.</p>

      <div className="mt-5">
        {groups.isLoading ? <Loader2 className="animate-spin text-teal-500" /> : (
          <Select value={id} onChange={(e) => setId(e.target.value)} className="max-w-sm"><option value="">Select a group…</option>{groups.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
        )}
      </div>

      {g && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border bg-white p-5">
            <h2 className="font-display text-sm font-bold text-navy-900">Cover image (1600×400)</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="Group cover" className="mt-3 w-full rounded-lg border" />
            <a href={cover} download className="mt-3 inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"><Download className="h-4 w-4" /> Download cover</a>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h2 className="font-display text-sm font-bold text-navy-900">Pinned message</h2>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-navy-50 p-3 text-sm text-navy-800">{pinned}</pre>
            <Button className="mt-2" size="sm" onClick={() => copy(pinned)}><Copy className="h-4 w-4" /> Copy</Button>
          </div>
        </div>
      )}
    </div>
  );
}
