'use client';

import { LayoutDashboard, PlusCircle, Briefcase, Building2, Users, BarChart3, BadgeCheck, MessageSquare } from 'lucide-react';
import { DashboardSidebar, MobileTabs, type NavItem } from '@/components/dashboard/sidebar';
import { HrChatbot } from '@/components/ai/hr-chatbot';

const NAV: NavItem[] = [
  { href: '/employer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employer/post', label: 'Post a Job', icon: PlusCircle },
  { href: '/employer/jobs', label: 'Manage Jobs', icon: Briefcase },
  { href: '/employer/candidates', label: 'Candidate Search', icon: Users },
  { href: '/employer/messages', label: 'Messages', icon: MessageSquare },
  { href: '/employer/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/employer/verify', label: 'Verification', icon: BadgeCheck },
  { href: '/employer/profile', label: 'Company Profile', icon: Building2 },
];

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl">
      <DashboardSidebar items={NAV} title="Employer" />
      <div className="min-w-0 flex-1">
        <MobileTabs items={NAV} />
        <div className="p-4 md:p-8">{children}</div>
      </div>
      <HrChatbot />
    </div>
  );
}
