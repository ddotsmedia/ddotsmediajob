'use client';

import { LayoutDashboard, CheckSquare, Users, ScrollText, FileEdit, BadgeCheck } from 'lucide-react';
import { DashboardSidebar, MobileTabs, type NavItem } from '@/components/dashboard/sidebar';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/approvals', label: 'Job Approvals', icon: CheckSquare },
  { href: '/admin/verifications', label: 'Verifications', icon: BadgeCheck },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/blog', label: 'Blog Editor', icon: FileEdit },
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
