'use client';

import Link from 'next/link';
import { FilePen } from 'lucide-react';
import { DashboardSidebar, MobileTabs } from '@/components/dashboard/sidebar';
import { NAV } from '@/lib/admin-nav';
import { CommandPalette } from '@/components/admin/command-palette';
import { RealtimeUpdatesListener } from '@/components/admin/realtime-updates-listener';
import { trpc } from '@/trpc/react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const stats = trpc.admin.stats.useQuery(undefined, { staleTime: 60_000 });
  const feedbackUnread = trpc.admin.feedbackUnread.useQuery(undefined, { staleTime: 60_000 });
  const draftCount = stats.data?.draftJobs ?? 0;
  const unread = feedbackUnread.data ?? 0;
  const nav = NAV.map((n) => {
    if (n.href === '/admin/jobs/drafts' && draftCount > 0) return { ...n, badge: draftCount };
    if (n.href === '/admin/feedback' && unread > 0) return { ...n, badge: unread };
    return n;
  });
  return (
    <div className="mx-auto flex max-w-7xl">
      {/* Global to the admin area — Cmd/Ctrl+K works on every admin page. */}
      <CommandPalette />
      {/* Keeps open admin screens current when another admin changes something. */}
      <RealtimeUpdatesListener />
      <DashboardSidebar items={nav} title="Admin Panel" variant="dark" />
      <div className="min-w-0 flex-1">
        {/* Header action bar — Drafts quick access (mobile + desktop). */}
        <div className="flex items-center justify-between gap-2 border-b border-navy-800 bg-navy-900 px-4 py-2">
          <span className="text-sm font-semibold text-white/80">Admin</span>
          <Link
            href="/admin/jobs/drafts"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-navy-100/80 transition-colors hover:border-amber-400 hover:text-white"
          >
            <FilePen className="h-4 w-4" />
            Drafts
            {draftCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">{draftCount}</span>
            )}
          </Link>
        </div>
        <MobileTabs items={nav} variant="dark" />
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
