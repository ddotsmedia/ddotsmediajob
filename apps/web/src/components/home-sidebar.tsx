'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid, UserPlus, Bell, FileText, MessagesSquare, Mic, MessageCircle, BarChart3, Award, Scale,
  Layers, Trophy, TrendingUp, Plus, Users, LayoutDashboard, Building2, GraduationCap, Newspaper,
  HelpCircle, Activity, Laptop, Car, Star, Calendar, Medal, Search, MessageSquare,
} from 'lucide-react';
import { CATEGORIES, formatJobCount } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { CategoryIcon } from '@/components/category-icon';
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

const linkBase = 'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors duration-150 hover:bg-[rgba(42,154,164,0.08)]';
const iconBox = 'flex min-w-[20px] justify-center';
const titleCls = 'mb-1.5 mt-4 pl-2 text-[11px] font-semibold tracking-[0.03em] text-[#64748b]';

export function HomeSidebar() {
  const pathname = usePathname();
  const stats = trpc.jobs.stats.useQuery(undefined, { staleTime: 300_000 });
  const counts = stats.data?.byCategory ?? {};

  const rowCls = (active: boolean) =>
    cn(linkBase, active ? 'border-l-2 border-[#2a9aa4] bg-[#e0f5f7] pl-[6px] font-medium text-[#085041]' : 'text-navy-800');

  return (
    <div className="max-h-[calc(100vh-120px)] overflow-y-auto border-r border-navy-100 bg-white pr-3 [scrollbar-color:#e2e8f0_transparent] [scrollbar-width:thin]">
      {SECTIONS.map((s) => (
        <div key={s.title}>
          <p className={titleCls}>{s.title}</p>
          <nav className="space-y-0.5">
            {s.items.map((it) => {
              const active = pathname === it.href;
              const Icon = it.icon;
              return (
                <Link key={it.href} href={it.href} className={rowCls(active)}>
                  <span className={iconBox}><Icon className="h-4 w-4 shrink-0 text-[#2a9aa4]" /></span>
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      {/* Categories with live job counts */}
      <p className={titleCls}>Browse by Category</p>
      <nav className="space-y-0.5">
        {CATEGORIES.map((c) => {
          const active = pathname === `/category/${c.slug}`;
          const n = counts[c.slug] ?? 0;
          return (
            <Link key={c.slug} href={`/category/${c.slug}`} className={rowCls(active)}>
              <span className={iconBox}><CategoryIcon name={c.icon} className="h-4 w-4 shrink-0 text-[#2a9aa4]" /></span>
              <span className="flex-1 truncate">{c.name}</span>
              {n > 0 && <span className="rounded-full bg-[#f0fdf4] px-1.5 py-0.5 text-[10px] font-medium text-[#14532d]" title={formatJobCount(n)}>{n}</span>}
            </Link>
          );
        })}
      </nav>

      <p className={titleCls}>Support</p>
      <Link href="/feedback" className={rowCls(pathname === '/feedback')}>
        <span className={iconBox}><MessageSquare className="h-4 w-4 shrink-0 text-[#2a9aa4]" /></span> Send Feedback
      </Link>

      <div className="mt-4 rounded-lg bg-[#e8f8ee] p-3">
        <p className="text-sm font-bold text-navy-900">80,000+ professionals</p>
        <p className="text-xs text-navy-700/70">76 groups · Post jobs free</p>
        <Link href="/whatsapp-groups" className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1da851]">
          Join community
        </Link>
      </div>
    </div>
  );
}
