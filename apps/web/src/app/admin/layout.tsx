'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  ScrollText,
  FileEdit,
  BadgeCheck,
  Briefcase,
  Building2,
  Star,
  MessageCircle,
  MessagesSquare,
  Banknote,
  Settings,
  PlusCircle,
  Award,
  FileText,
  TrendingUp,
  Layers,
  Bookmark,
  Sparkles,
  FilePen,
  Tags,
  Inbox,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Flag,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardSidebar, MobileTabs, type NavItem } from '@/components/dashboard/sidebar';
import { RealtimeUpdatesListener } from '@/components/admin/realtime-updates-listener';
import { JobSearchDialog } from '@/components/admin/job-search-dialog';
import { useAdminPendingJobs } from '@/hooks/useAdminPendingJobs';
import { trpc } from '@/trpc/react';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/cv-analytics', label: 'CV Costs', icon: DollarSign },
  { href: '/admin/jobs/add', label: 'Add Job', icon: PlusCircle },
  { href: '/admin/quick-import', label: 'Quick Import', icon: Sparkles },
  { href: '/admin/tools/bulk-import', label: 'Bulk Import', icon: Layers },
  { href: '/admin/bulk-extract', label: 'Bulk Extract', icon: Layers },
  { href: '/admin/tools/bookmarklet', label: 'Bookmarklet', icon: Bookmark },
  { href: '/admin/approvals', label: 'Job Approvals', icon: CheckSquare },
  { href: '/admin/jobs', label: 'All Jobs', icon: Briefcase },
  { href: '/admin/jobs/drafts', label: 'Drafts', icon: FilePen },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/applications', label: 'Applications', icon: FileText },
  { href: '/admin/verifications', label: 'Verifications', icon: BadgeCheck },
  { href: '/admin/companies', label: 'Companies', icon: Building2 },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/whatsapp', label: 'WhatsApp Groups', icon: MessageCircle },
  { href: '/admin/whatsapp-bot', label: 'WhatsApp Bot', icon: MessageCircle },
  { href: '/admin/salary', label: 'Salary Reports', icon: Banknote },
  { href: '/admin/community', label: 'Community', icon: MessagesSquare },
  { href: '/admin/assessments', label: 'Assessments', icon: Award },
  { href: '/admin/success-stories', label: 'Success Stories', icon: Star },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/blog', label: 'Blog Editor', icon: FileEdit },
  { href: '/admin/feedback', label: 'Feedback', icon: Inbox },
  { href: '/admin/reports', label: 'Job Reports', icon: ShieldAlert },
  { href: '/admin/verification-queue', label: 'Verify Queue', icon: ShieldCheck },
  { href: '/admin/feature-flags', label: 'Feature Flags', icon: Flag },
  { href: '/admin/cta-funnel', label: 'CTA Analytics', icon: TrendingUp },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const stats = trpc.admin.stats.useQuery(undefined, { staleTime: 60_000 });
  const feedbackUnread = trpc.admin.feedbackUnread.useQuery(undefined, { staleTime: 60_000 });
  // Polls on its own 30s interval and toasts on growth — stats is staleTime 60s
  // and would make the badge lag the queue.
  const pendingCount = useAdminPendingJobs();
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd/Ctrl+K toggles job search from anywhere in the admin panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      // Functional update, so the handler never closes over a stale value and
      // the listener does not need re-binding on every toggle.
      setSearchOpen((v) => !v);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const draftCount = stats.data?.draftJobs ?? 0;
  const unread = feedbackUnread.data ?? 0;
  const nav = NAV.map((n) => {
    if (n.href === '/admin/jobs/drafts' && draftCount > 0) return { ...n, badge: draftCount };
    if (n.href === '/admin/feedback' && unread > 0) return { ...n, badge: unread };
    if (n.href === '/admin/approvals' && pendingCount > 0) return { ...n, badge: pendingCount };
    return n;
  });
  return (
    <div className="mx-auto flex max-w-7xl">
      {/* Refreshes open admin screens when another admin, an employer or a
          candidate changes something. Inert without Pusher credentials. */}
      <RealtimeUpdatesListener />
      <JobSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <DashboardSidebar items={nav} title="Admin Panel" variant="dark" />
      <div className="min-w-0 flex-1">
        {/* Header action bar — Drafts quick access (mobile + desktop). */}
        <div className="flex items-center justify-between gap-2 border-b border-navy-800 bg-navy-900 px-4 py-2">
          <span className="text-sm font-semibold text-white/80">Admin</span>
          <div className="flex items-center gap-2">
          {/* Cmd+K is invisible without a trigger, and unreachable on touch. */}
          <button
            type="button"
            onClick={openSearch}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-navy-100/80 transition-colors hover:border-teal-400 hover:text-white"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search jobs</span>
            <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 text-[10px] md:inline">⌘K</kbd>
          </button>
          {pendingCount > 0 && (
            <Link
              href="/admin/approvals"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-navy-100/80 transition-colors hover:border-red-400 hover:text-white"
            >
              <CheckSquare className="h-4 w-4" />
              Approvals
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{pendingCount}</span>
            </Link>
          )}
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
        </div>
        <MobileTabs items={nav} variant="dark" />
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
