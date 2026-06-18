'use client';

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
} from 'lucide-react';
import Link from 'next/link';
import { DashboardSidebar, MobileTabs, type NavItem } from '@/components/dashboard/sidebar';
import { trpc } from '@/trpc/react';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/jobs/add', label: 'Add Job', icon: PlusCircle },
  { href: '/admin/quick-import', label: 'Quick Import', icon: Sparkles },
  { href: '/admin/tools/bulk-import', label: 'Bulk Import', icon: Layers },
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
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
];

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
