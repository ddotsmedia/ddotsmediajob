'use client';

import { LayoutDashboard, PlusCircle, Briefcase, Building2, Users, BarChart3, BadgeCheck, MessageSquare, Sparkles, Landmark, FileCheck2, ClipboardCheck, CalendarDays, UsersRound, Video, Inbox } from 'lucide-react';
import { DashboardSidebar, MobileTabs, type NavItem } from '@/components/dashboard/sidebar';
import { HrChatbot } from '@/components/ai/hr-chatbot';

const NAV: NavItem[] = [
  { href: '/employer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employer/post', label: 'Post a Job', icon: PlusCircle },
  { href: '/employer/jobs', label: 'Manage Jobs', icon: Briefcase },
  { href: '/employer/applications', label: 'Applications', icon: Inbox },
  { href: '/employer/candidates', label: 'CV Search', icon: Users },
  { href: '/employer/video-interviews', label: 'Video Interviews', icon: Video },
  { href: '/employer/scorecards', label: 'Scorecards', icon: ClipboardCheck },
  { href: '/employer/events', label: 'Hiring Events', icon: CalendarDays },
  { href: '/employer/ai-tools', label: 'AI Tools', icon: Sparkles },
  { href: '/employer/messages', label: 'Messages', icon: MessageSquare },
  { href: '/employer/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/employer/nafis-dashboard', label: 'Nafis', icon: Landmark },
  { href: '/employer/mohre', label: 'MOHRE Permits', icon: FileCheck2 },
  { href: '/employer/verify', label: 'Verification', icon: BadgeCheck },
  { href: '/employer/team', label: 'Team', icon: UsersRound },
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
