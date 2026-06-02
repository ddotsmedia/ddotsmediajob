'use client';

import { LayoutDashboard, FileText, Bookmark, Bell, User, FileSpreadsheet, Sparkles } from 'lucide-react';
import { DashboardSidebar, MobileTabs, type NavItem } from '@/components/dashboard/sidebar';

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/applications', label: 'Applications', icon: FileText },
  { href: '/dashboard/saved', label: 'Saved Jobs', icon: Bookmark },
  { href: '/dashboard/alerts', label: 'Job Alerts', icon: Bell },
  { href: '/dashboard/cv', label: 'CV & ATS', icon: FileSpreadsheet },
  { href: '/dashboard/ai', label: 'AI Tools', icon: Sparkles },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl">
      <DashboardSidebar items={NAV} title="Jobseeker" />
      <div className="min-w-0 flex-1">
        <MobileTabs items={NAV} />
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
