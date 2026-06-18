'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid, UserPlus, Bell, FileText, MessagesSquare, Mic, MessageCircle, BarChart3, Award, Scale,
  Layers, Trophy, TrendingUp, Plus, Users, LayoutDashboard, Building2, GraduationCap, Newspaper,
  HelpCircle, Activity, Laptop, Car, Star, Calendar, Medal, Search, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = { label: string; href: string; icon: LucideIcon };
const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'For Jobseekers',
    items: [
      { label: 'Browse Jobs', href: '/jobs', icon: LayoutGrid },
      { label: 'Create Account', href: '/register', icon: UserPlus },
      { label: 'Job Alerts', href: '/dashboard/alerts', icon: Bell },
      { label: 'ATS CV Builder', href: '/cv-builder', icon: FileText },
      { label: 'AI Career Advisor', href: '/career-advisor', icon: MessagesSquare },
      { label: 'AI Interview Prep', href: '/interview-prep', icon: Mic },
      { label: 'WhatsApp Groups', href: '/whatsapp-groups', icon: MessageCircle },
      { label: 'Salary Guide', href: '/salary-guide', icon: BarChart3 },
      { label: 'Skill Assessments', href: '/assessments', icon: Award },
      { label: 'Compare Jobs', href: '/compare', icon: Scale },
      { label: 'Swipe Jobs', href: '/swipe', icon: Layers },
      { label: 'Success Stories', href: '/success-stories', icon: Trophy },
      { label: 'Market Insights', href: '/market-insights', icon: TrendingUp },
    ],
  },
  {
    title: 'For Employers',
    items: [
      { label: 'Post a Job', href: '/employer/post', icon: Plus },
      { label: 'Browse Talent', href: '/talent', icon: Users },
      { label: 'Employer Dashboard', href: '/employer', icon: LayoutDashboard },
      { label: 'Company Profiles', href: '/companies', icon: Building2 },
      { label: 'Campus Jobs', href: '/campus', icon: GraduationCap },
      { label: 'Hiring Blog', href: '/blog', icon: Newspaper },
    ],
  },
  {
    title: 'Community',
    items: [
      { label: 'Community Forum', href: '/community', icon: MessageCircle },
      { label: 'Q&A', href: '/community/qa', icon: HelpCircle },
      { label: 'Healthcare Community', href: '/community/profession/healthcare', icon: Activity },
      { label: 'IT Community', href: '/community/profession/it', icon: Laptop },
      { label: 'Driving Community', href: '/community/profession/driving', icon: Car },
      { label: 'Find a Mentor', href: '/community/mentors', icon: Star },
      { label: 'Events', href: '/community/events', icon: Calendar },
      { label: 'Leaderboard', href: '/community/leaderboard', icon: Medal },
    ],
  },
  {
    title: 'Popular Searches',
    items: [
      { label: 'Jobs for Indians', href: '/jobs/jobs-for-indians-in-uae', icon: Search },
      { label: 'Jobs for Filipinos', href: '/jobs/jobs-for-filipinos-in-dubai', icon: Search },
      { label: 'Walk In Interviews', href: '/jobs/walk-in-interview-dubai', icon: Search },
      { label: 'Urgent Hiring', href: '/jobs/urgent-hiring-uae', icon: Search },
      { label: 'Fresher Jobs', href: '/jobs/fresher-jobs-uae', icon: Search },
      { label: 'Visa Provided Jobs', href: '/jobs/visa-provided', icon: Search },
    ],
  },
];

export function HomeSidebar() {
  const pathname = usePathname();
  return (
    <div className="sticky top-20 max-h-[calc(100vh-100px)] space-y-3 overflow-y-auto rounded-xl border bg-white p-3 scrollbar-hide">
      {SECTIONS.map((s, i) => (
        <div key={s.title} className={cn(i > 0 && 'border-t pt-3')}>
          <p className="mb-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-navy-700/50">{s.title}</p>
          <nav className="space-y-0.5">
            {s.items.map((it) => {
              const active = pathname === it.href;
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 text-[11px] transition-colors',
                    active ? 'bg-teal-50 font-medium text-[#085041]' : 'text-navy-800 hover:bg-teal-50 hover:text-[#085041]',
                  )}
                >
                  <Icon className="h-[13px] w-[13px] shrink-0 text-teal-600" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="border-t pt-3">
        <Link href="/feedback" className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 text-[11px] text-navy-800 hover:bg-teal-50 hover:text-[#085041]">
          <MessageSquare className="h-[13px] w-[13px] shrink-0 text-teal-600" /> Send Feedback
        </Link>
      </div>

      <div className="rounded-lg bg-[#e8f8ee] p-3">
        <p className="text-sm font-bold text-navy-900">80,000+ professionals</p>
        <p className="text-xs text-navy-700/70">76 groups · Post jobs free</p>
        <Link href="/whatsapp-groups" className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1da851]">
          Join community
        </Link>
      </div>
    </div>
  );
}
