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
} from 'lucide-react';
import { DashboardSidebar, MobileTabs, type NavItem } from '@/components/dashboard/sidebar';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/jobs/add', label: 'Add Job', icon: PlusCircle },
  { href: '/admin/approvals', label: 'Job Approvals', icon: CheckSquare },
  { href: '/admin/jobs', label: 'All Jobs', icon: Briefcase },
  { href: '/admin/verifications', label: 'Verifications', icon: BadgeCheck },
  { href: '/admin/companies', label: 'Companies', icon: Building2 },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/whatsapp', label: 'WhatsApp Groups', icon: MessageCircle },
  { href: '/admin/salary', label: 'Salary Reports', icon: Banknote },
  { href: '/admin/community', label: 'Community', icon: MessagesSquare },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/blog', label: 'Blog Editor', icon: FileEdit },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl">
      <DashboardSidebar items={NAV} title="Admin" />
      <div className="min-w-0 flex-1">
        <MobileTabs items={NAV} />
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
